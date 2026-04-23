import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import {
  searchProfilesByUsername,
  type SocialProfile,
} from "../../src/features/social";
import { ProfileAvatar } from "../../src/ui";

const SEARCH_DEBOUNCE_MS = 320;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocialProfile[]>([]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let cancelled = false;

    if (!normalizedQuery) {
      setResults([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const timer = setTimeout(() => {
      void searchProfilesByUsername(normalizedQuery, 20).then((result) => {
        if (cancelled) {
          return;
        }
        setIsLoading(false);
        setResults(result.data);
        setErrorMessage(result.error);

        if (result.error && __DEV__) {
          console.error("Failed to search profiles", result.error);
        }
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom + 120, 144),
          paddingTop: Math.max(insets.top + 12, 28),
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>

        {user?.id ? (
          <Link asChild href={`/(app)/profile/${user.id}`}>
            <Pressable style={styles.headerButton}>
              <Text style={styles.headerButtonText}>My profile</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>

      <Text style={styles.title}>Search people</Text>
      <Text style={styles.subtitle}>
        Find creators by username. Search is case-insensitive and partial match.
      </Text>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder="@username"
        placeholderTextColor={theme.color.inkSoft}
        style={styles.input}
        value={query}
      />

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.stateText}>Searching…</Text>
        </View>
      ) : null}

      {!isLoading && !query.trim() ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Start with a username</Text>
          <Text style={styles.stateText}>
            Try a few letters and we’ll load matching profiles.
          </Text>
        </View>
      ) : null}

      {!isLoading && query.trim() && errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Search unavailable</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!isLoading && query.trim() && !errorMessage && results.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No matches yet</Text>
          <Text style={styles.stateText}>
            No profiles matched “{query.trim()}”.
          </Text>
        </View>
      ) : null}

      {!isLoading && results.length > 0 ? (
        <View style={styles.resultsCard}>
          {results.map((result) => (
            <Link key={result.id} asChild href={`/(app)/profile/${result.id}`}>
              <Pressable style={styles.resultRow}>
                <ProfileAvatar
                  avatarUrl={result.avatar_url}
                  size={58}
                  username={result.username}
                />
                <View style={styles.resultMeta}>
                  <Text style={styles.resultUsername}>@{result.username}</Text>
                  <Text numberOfLines={2} style={styles.resultBio}>
                    {result.bio?.trim() || "No bio yet."}
                  </Text>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  headerButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: theme.color.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  input: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    color: theme.color.ink,
    fontSize: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  resultBio: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  resultMeta: {
    flex: 1,
    marginLeft: 14,
  },
  resultRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 14,
  },
  resultsCard: {
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
  },
  resultUsername: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  stateText: {
    color: theme.color.inkSoft,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  stateTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
  },
});
