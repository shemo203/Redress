import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../../lib/supabaseClient";
import { buildDefaultUsername, isUsernameValid, normalizeUsername } from "../../utils";

type Profile = {
  avatar_url: string | null;
  id: string;
  username: string;
};

type AuthContextValue = {
  isLoading: boolean;
  profile: Profile | null;
  session: Session | null;
  sessionLoaded: boolean;
  user: User | null;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureProfileForUser(user: User): Promise<Profile> {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const metadataUsername =
    typeof user.user_metadata?.username === "string"
      ? normalizeUsername(user.user_metadata.username)
      : "";
  const username = isUsernameValid(metadataUsername)
    ? metadataUsername
    : buildDefaultUsername(user.id, user.email);
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      updated_at: new Date().toISOString(),
      username,
    })
    .select("id, username, avatar_url")
    .single();

  if (!error) {
    return data;
  }

  if (error.code === "23505") {
    const { data: racedProfile, error: racedProfileError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", user.id)
      .single();

    if (racedProfileError) {
      throw racedProfileError;
    }

    return racedProfile;
  }

  throw error;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const lastUpsertedUserId = useRef<string | null>(null);

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setProfile(data ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }
        setSession(data.session ?? null);
        setSessionLoaded(Boolean(data.session));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.toLowerCase().includes("refresh token")) {
          await supabase.auth.signOut({ scope: "local" });
        }
        if (__DEV__) {
          console.error("Failed to read auth session", error);
        }
        if (isMounted) {
          setSession(null);
          setSessionLoaded(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initialize();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setSessionLoaded(Boolean(nextSession));
      setIsLoading(false);
      if (!nextSession) {
        lastUpsertedUserId.current = null;
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const currentUser = session?.user ?? null;
    if (!currentUser) {
      return;
    }
    const currentUserId = currentUser.id;
    if (lastUpsertedUserId.current === currentUserId) {
      return;
    }

    let isCancelled = false;

    const run = async () => {
      try {
        const nextProfile = await ensureProfileForUser(currentUser);
        if (!isCancelled) {
          setProfile(nextProfile);
          lastUpsertedUserId.current = currentUserId;
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to ensure profile", error);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        profile,
        refreshProfile,
        session,
        sessionLoaded,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
