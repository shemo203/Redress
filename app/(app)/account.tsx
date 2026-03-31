import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

import { theme } from "../../src/constants";
import {
  getRecentOutboundClickDebugEntries,
  type OutboundClickDebugEntry,
} from "../../src/features/analytics";
import { useAuth } from "../../src/features/auth";
import { fetchMyReports, type ReportRecord } from "../../src/features/reports";
import { supabase } from "../../src/lib/supabaseClient";

type ProfileSummary = {
  avgGrade: number | null;
  draftCount: number;
  publishedCount: number;
};

type FitPreview = {
  caption: string;
  created_at: string;
  id: string;
  status: "draft" | "published";
};

function formatUsername(raw: string | null | undefined) {
  if (raw && raw.trim().length > 0) {
    return raw.trim();
  }
  return "your.style";
}

export default function AccountScreen() {
  const { profile, user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugClicks, setDebugClicks] = useState<OutboundClickDebugEntry[]>([]);
  const [debugReports, setDebugReports] = useState<ReportRecord[]>([]);
  const [summary, setSummary] = useState<ProfileSummary>({
    avgGrade: null,
    draftCount: 0,
    publishedCount: 0,
  });
  const [fits, setFits] = useState<FitPreview[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadProfileData = async () => {
        if (!user?.id) {
          if (!cancelled) {
            setFits([]);
            setDebugClicks([]);
            setDebugReports([]);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        setStatusMessage(null);

        const { data: posts, error: postsError } = await supabase
          .from("video_posts")
          .select("id, caption, created_at, status")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12);

        if (postsError) {
          if (!cancelled) {
            setStatusMessage(`Failed to load profile stats: ${postsError.message}`);
            setIsLoading(false);
          }
          return;
        }

        const typedPosts = (posts ?? []) as FitPreview[];
        const publishedIds = typedPosts
          .filter((post) => post.status === "published")
          .map((post) => post.id);

        let avgGrade: number | null = null;
        if (publishedIds.length > 0) {
          const { data: grades } = await supabase
            .from("grades")
            .select("value")
            .in("post_id", publishedIds);

          if (grades && grades.length > 0) {
            const sum = grades.reduce((total, grade) => total + grade.value, 0);
            avgGrade = Math.round((sum / grades.length) * 10) / 10;
          }
        }

        if (cancelled) {
          return;
        }

        setSummary({
          avgGrade,
          draftCount: typedPosts.filter((post) => post.status === "draft").length,
          publishedCount: typedPosts.filter((post) => post.status === "published").length,
        });
        setFits(typedPosts.slice(0, 6));
        const reportsResult = __DEV__ ? await fetchMyReports(user.id) : { data: [], error: null };
        if (cancelled) {
          return;
        }
        if (__DEV__ && reportsResult.error && !cancelled) {
          console.error("Failed to load my reports", reportsResult.error);
        }
        setDebugClicks(
          __DEV__
            ? getRecentOutboundClickDebugEntries().filter(
                (entry) => entry.userId === user.id
              )
            : []
        );
        setDebugReports(__DEV__ ? reportsResult.data : []);
        setIsLoading(false);
      };

      void loadProfileData();

      return () => {
        cancelled = true;
      };
    }, [user?.id])
  );

  const handleSignOut = async () => {
    setStatusMessage(null);
    setIsSubmitting(true);
    const { error } = await supabase.auth.signOut();
    setIsSubmitting(false);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setStatusMessage("Signed out.");
  };

  const displayUsername = formatUsername(profile?.username ?? user?.email?.split("@")[0]);
  const monogram = displayUsername.charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroGlow} />

      <View style={styles.headerRow}>
        <Text style={styles.heading}>@{displayUsername}</Text>
        <View style={styles.settingsButton}>
          <Text style={styles.settingsGlyph}>⚙</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.statsColumn}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.publishedCount}</Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{summary.draftCount}</Text>
            <Text style={styles.statLabel}>Drafts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.statValueAccent]}>
              {summary.avgGrade != null ? summary.avgGrade.toFixed(1) : "—"}
            </Text>
            <Text style={styles.statLabel}>AVG.</Text>
          </View>
        </View>

        <View style={styles.heroSplit} />
        <View style={styles.monogramWrap}>
          <View style={styles.monogramCircle}>
            <Text style={styles.monogramText}>{monogram}</Text>
          </View>
          <Text style={styles.monogramCopy}>Your profile, fits, and score summary.</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your Fits</Text>

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      ) : fits.length === 0 ? (
        <View style={styles.emptyFitsCard}>
          <Text style={styles.emptyFitsTitle}>No fits posted yet</Text>
          <Text style={styles.emptyFitsCopy}>
            Use the new post button in the dock to upload your first fit.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fitRow}
        >
          {fits.map((fit, index) => {
            const isDarkTile = index % 3 !== 0;

            return (
              <View
                key={fit.id}
                style={[
                  styles.fitTile,
                  index % 3 === 1
                    ? styles.fitTileAccent
                    : index % 3 === 2
                      ? styles.fitTileInk
                      : undefined,
                ]}
              >
                <Text style={[styles.fitStatus, isDarkTile ? styles.fitTextOnDark : undefined]}>
                  {fit.status.toUpperCase()}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.fitCaption, isDarkTile ? styles.fitTextOnDark : undefined]}
                >
                  {fit.caption || "Untitled fit"}
                </Text>
                <Text style={[styles.fitMeta, isDarkTile ? styles.fitMetaOnDark : undefined]}>
                  {new Date(fit.created_at).toLocaleDateString()}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Email</Text>
        <Text style={styles.infoValue}>{user?.email ?? "-"}</Text>

        <Text style={styles.infoLabel}>User ID</Text>
        <Text numberOfLines={2} style={styles.infoValue}>
          {user?.id ?? "-"}
        </Text>

        <Pressable
          disabled={isSubmitting}
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          <Text style={styles.signOutText}>
            {isSubmitting ? "Signing out..." : "Sign out"}
          </Text>
        </Pressable>
      </View>

      {__DEV__ ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugHeading}>Dev: recent outbound clicks</Text>
          <Text style={styles.debugHint}>
            Session-local debug list for this user. DB reads remain blocked by current RLS.
          </Text>
          {debugClicks.length === 0 ? (
            <Text style={styles.debugEmpty}>No click logs captured in this session yet.</Text>
          ) : (
            debugClicks.map((entry) => (
              <View key={`${entry.createdAt}-${entry.tagId}`} style={styles.debugRow}>
                <Text style={styles.debugValue}>{entry.createdAt}</Text>
                <Text style={styles.debugValue}>post: {entry.postId}</Text>
                <Text style={styles.debugValue}>tag: {entry.tagId}</Text>
                <Text style={styles.debugValue}>url: {entry.url}</Text>
                <Text
                  style={[
                    styles.debugValue,
                    entry.error ? styles.debugError : styles.debugOk,
                  ]}
                >
                  {entry.error ? `error: ${entry.error}` : "inserted"}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugHeading}>Dev: my reports</Text>
          <Text style={styles.debugHint}>
            Last 20 reports submitted by this user from the `reports` table.
          </Text>
          {debugReports.length === 0 ? (
            <Text style={styles.debugEmpty}>No reports submitted yet.</Text>
          ) : (
            debugReports.map((report) => (
              <View key={report.id} style={styles.debugRow}>
                <Text style={styles.debugValue}>{report.created_at}</Text>
                <Text style={styles.debugValue}>type: {report.target_type}</Text>
                <Text style={styles.debugValue}>target: {report.target_id}</Text>
                <Text style={styles.debugValue}>reason: {report.reason}</Text>
                {report.details ? (
                  <Text style={styles.debugValue}>details: {report.details}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      ) : null}

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    padding: 18,
  },
  debugCard: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: theme.spacing.md,
  },
  debugEmpty: {
    color: theme.color.muted,
    marginTop: 8,
  },
  debugError: {
    color: theme.color.danger,
  },
  debugHeading: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  debugHint: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 4,
  },
  debugOk: {
    color: theme.color.accentBright,
  },
  debugRow: {
    borderTopColor: theme.color.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  debugValue: {
    color: theme.color.ink,
    fontSize: 12,
    marginTop: 2,
  },
  emptyFitsCard: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  emptyFitsCopy: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  emptyFitsTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
  },
  fitCaption: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 42,
  },
  fitMeta: {
    color: theme.color.inkSoft,
    fontSize: 13,
    marginTop: 10,
  },
  fitMetaOnDark: {
    color: "rgba(255,255,255,0.72)",
  },
  fitRow: {
    paddingBottom: 4,
  },
  fitStatus: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  fitTile: {
    backgroundColor: "#e6ddd3",
    borderRadius: 24,
    height: 170,
    marginRight: 14,
    padding: 18,
    width: 176,
  },
  fitTileAccent: {
    backgroundColor: "#7b2b83",
  },
  fitTileInk: {
    backgroundColor: "#274c8e",
  },
  fitTextOnDark: {
    color: theme.color.white,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heading: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: "#e4dbd2",
    borderRadius: 30,
    flexDirection: "row",
    minHeight: 420,
    overflow: "hidden",
    padding: 26,
  },
  heroGlow: {
    backgroundColor: "rgba(240, 228, 215, 0.7)",
    borderRadius: 260,
    height: 340,
    position: "absolute",
    right: -40,
    top: 100,
    width: 340,
  },
  heroSplit: {
    backgroundColor: "rgba(255,255,255,0.28)",
    height: "140%",
    position: "absolute",
    right: "44%",
    top: -36,
    transform: [{ rotate: "8deg" }],
    width: 1,
  },
  infoCard: {
    backgroundColor: "rgba(255,249,243,0.95)",
    borderColor: theme.color.border,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  infoLabel: {
    color: theme.color.inkSoft,
    fontSize: 13,
    marginTop: 8,
  },
  infoValue: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  loadingText: {
    color: theme.color.inkSoft,
    marginTop: 10,
  },
  monogramCircle: {
    alignItems: "center",
    backgroundColor: "rgba(247,241,234,0.88)",
    borderColor: "rgba(140,120,110,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 124,
    justifyContent: "center",
    width: 124,
  },
  monogramCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    textAlign: "center",
    width: 170,
  },
  monogramText: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 42,
    fontWeight: "700",
  },
  monogramWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingLeft: 12,
  },
  sectionTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 14,
    marginTop: 24,
  },
  settingsButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  settingsGlyph: {
    color: theme.color.inkSoft,
    fontSize: 24,
  },
  signOutButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingVertical: 13,
  },
  signOutText: {
    color: theme.color.white,
    fontWeight: "700",
  },
  statCard: {
    backgroundColor: "rgba(255,249,243,0.88)",
    borderRadius: 22,
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  statLabel: {
    color: theme.color.inkSoft,
    fontSize: 16,
    marginTop: 6,
  },
  statValue: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
  },
  statValueAccent: {
    color: theme.color.accentBright,
  },
  statsColumn: {
    paddingRight: 18,
    width: 178,
    zIndex: 1,
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 12,
    textAlign: "center",
  },
});
