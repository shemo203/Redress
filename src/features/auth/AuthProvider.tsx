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

function buildDefaultUsername(user: User): string {
  const rawPrefix = user.email?.split("@")[0] ?? "user";
  const cleanPrefix = rawPrefix.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const safePrefix = cleanPrefix.length >= 3 ? cleanPrefix : "user";
  const suffix = user.id.replace(/-/g, "").slice(0, 6);
  return `${safePrefix.slice(0, 23)}_${suffix}`.slice(0, 30);
}

async function upsertProfileForUser(user: User): Promise<Profile> {
  const username = buildDefaultUsername(user);
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        updated_at: new Date().toISOString(),
        username,
      },
      { onConflict: "id" }
    )
    .select("id, username, avatar_url")
    .single();

  if (error) {
    throw error;
  }

  return data;
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
        if (__DEV__) {
          console.error("Failed to read auth session", error);
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
        const nextProfile = await upsertProfileForUser(currentUser);
        if (!isCancelled) {
          setProfile(nextProfile);
          lastUpsertedUserId.current = currentUserId;
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Failed to upsert profile", error);
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
