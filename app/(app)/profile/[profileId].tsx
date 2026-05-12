import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../../src/constants";
import { useAuth } from "../../../src/features/auth";
import {
  fetchFollowCounts,
  fetchProfileById,
  fetchUserPosts,
  followUser,
  isFollowingProfile,
  type FollowCounts,
  type SocialPost,
  type SocialProfile,
  unfollowUser,
} from "../../../src/features/social";
import { supabase } from "../../../src/lib/supabaseClient";
import { ExpandableProfileBio, MediaSnapshot, ProfileAvatar } from "../../../src/ui";
import { chrome } from "../../../src/ui/chrome";

type ProfileFitPreview = SocialPost & {
  avgGrade: number | null;
};

const EMPTY_COUNTS: FollowCounts = {
  followersCount: 0,
  followingCount: 0,
};
const HERO_MIN_HEIGHT = 220;
const HERO_MAX_HEIGHT = 280;
const HERO_HEIGHT_RATIO = 0.28;

function formatCompactMetric(value: number) {
  if (value < 1000) {
    return `${value}`;
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function formatDisplayName(username: string) {
  const formatted = username
    .replace(/[_\.]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return formatted || "Profile";
}

function ProfileGridTile({
  fit,
  onPress,
}: {
  fit: ProfileFitPreview;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fitTile, pressed ? styles.fitTilePressed : undefined]}
    >
      <MediaSnapshot
        mediaType={fit.media_type}
        placeholderLabel={fit.media_type === "video" ? "Video" : "No media"}
        showVideoBadge={fit.media_type === "video"}
        style={styles.fitTileImage}
        uri={fit.video_url}
      />

      {fit.avgGrade != null ? (
        <View style={styles.fitScorePill}>
          <Text style={styles.fitScoreText}>{fit.avgGrade.toFixed(1)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();

  const targetProfileId = typeof profileId === "string" ? profileId : "";
  const isOwnProfile = Boolean(user?.id && user.id === targetProfileId);

  const [counts, setCounts] = useState<FollowCounts>(EMPTY_COUNTS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fits, setFits] = useState<ProfileFitPreview[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutatingFollow, setIsMutatingFollow] = useState(false);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const heroHeight = Math.max(
    HERO_MIN_HEIGHT,
    Math.min(HERO_MAX_HEIGHT, Math.round(screenHeight * HERO_HEIGHT_RATIO))
  );

  const loadProfileScreen = useCallback(async () => {
    if (!targetProfileId) {
      setProfile(null);
      setFits([]);
      setCounts(EMPTY_COUNTS);
      setIsFollowing(false);
      setErrorMessage("Missing profile id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const followPromise =
      user?.id && user.id !== targetProfileId
        ? isFollowingProfile(user.id, targetProfileId)
        : Promise.resolve({ data: false, error: null });

    const [profileResult, countsResult, postsResult, followResult] = await Promise.all([
      fetchProfileById(targetProfileId),
      fetchFollowCounts(targetProfileId),
      fetchUserPosts(targetProfileId, 18),
      followPromise,
    ]);

    if (profileResult.error && __DEV__) {
      console.error("Failed to load profile", profileResult.error);
    }
    if (countsResult.error && __DEV__) {
      console.error("Failed to load follow counts", countsResult.error);
    }
    if (postsResult.error && __DEV__) {
      console.error("Failed to load profile posts", postsResult.error);
    }
    if (followResult.error && __DEV__) {
      console.error("Failed to load follow state", followResult.error);
    }

    let gradedFits: ProfileFitPreview[] = postsResult.data.map((post) => ({
      ...post,
      avgGrade: null,
    }));

    if (postsResult.data.length > 0) {
      const postIds = postsResult.data.map((post) => post.id);
      const { data: grades, error: gradesError } = await supabase
        .from("grades")
        .select("post_id, value")
        .in("post_id", postIds);

      if (gradesError && __DEV__) {
        console.error("Failed to load profile grades", gradesError);
      }

      if (grades && grades.length > 0) {
        const groupedGrades = new Map<string, number[]>();
        for (const grade of grades) {
          const current = groupedGrades.get(grade.post_id) ?? [];
          current.push(grade.value);
          groupedGrades.set(grade.post_id, current);
        }

        gradedFits = postsResult.data.map((post) => {
          const values = groupedGrades.get(post.id) ?? [];
          if (values.length === 0) {
            return {
              ...post,
              avgGrade: null,
            };
          }

          return {
            ...post,
            avgGrade:
              Math.round(
                (values.reduce((total, value) => total + value, 0) / values.length) * 10
              ) / 10,
          };
        });
      }
    }

    setProfile(profileResult.data);
    setCounts(countsResult.data);
    setFits(gradedFits);
    setIsFollowing(followResult.data);
    setErrorMessage(
      profileResult.error ||
        countsResult.error ||
        postsResult.error ||
        followResult.error ||
        (profileResult.data ? null : "Profile not found.")
    );
    setIsLoading(false);
  }, [targetProfileId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfileScreen();
    }, [loadProfileScreen])
  );

  const reconcileFollowState = async () => {
    const nextCounts = await fetchFollowCounts(targetProfileId);
    if (!nextCounts.error) {
      setCounts(nextCounts.data);
    }

    if (user?.id && user.id !== targetProfileId) {
      const nextFollow = await isFollowingProfile(user.id, targetProfileId);
      if (!nextFollow.error) {
        setIsFollowing(nextFollow.data);
      }
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.id || !profile || isOwnProfile || isMutatingFollow) {
      return;
    }

    const nextFollowing = !isFollowing;
    const previousCounts = counts;
    const previousFollowing = isFollowing;

    setIsMutatingFollow(true);
    setStatusMessage(null);
    setIsFollowing(nextFollowing);
    setCounts({
      ...previousCounts,
      followersCount: Math.max(
        0,
        previousCounts.followersCount + (nextFollowing ? 1 : -1)
      ),
    });

    const result = nextFollowing
      ? await followUser(user.id, profile.id)
      : await unfollowUser(user.id, profile.id);

    if (result.error) {
      setIsFollowing(previousFollowing);
      setCounts(previousCounts);
      setStatusMessage(result.error);
      if (__DEV__) {
        console.error("Failed to toggle follow", result.error);
      }
      setIsMutatingFollow(false);
      return;
    }

    await reconcileFollowState();
    setStatusMessage(nextFollowing ? "Following saved." : "Unfollowed.");
    setIsMutatingFollow(false);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom + 120, 144),
          paddingTop: Math.max(insets.top + 8, 18),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={chrome.headerButton}>
          <Text style={chrome.headerButtonText}>Back</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[chrome.glassCardSoft, styles.stateCard]}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.stateText}>Loading profile…</Text>
        </View>
      ) : profile ? (
        <>
          <View style={[styles.profileHero, { minHeight: heroHeight }]}>
            <View style={styles.avatarRing}>
              <ProfileAvatar
                avatarUrl={profile.avatar_url}
                size={96}
                username={profile.username}
              />
            </View>

            <Text style={styles.profileName}>{formatDisplayName(profile.username)}</Text>
            <Text style={styles.profileHandle}>@{profile.username}</Text>
            {profile.bio?.trim() ? (
              <ExpandableProfileBio text={profile.bio.trim()} textStyle={styles.profileBio} />
            ) : null}

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{formatCompactMetric(fits.length)}</Text>
                <Text style={styles.heroStatLabel}>Posts</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {formatCompactMetric(counts.followersCount)}
                </Text>
                <Text style={styles.heroStatLabel}>Followers</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>
                  {formatCompactMetric(counts.followingCount)}
                </Text>
                <Text style={styles.heroStatLabel}>Following</Text>
              </View>
            </View>

            <View style={styles.heroActionsRow}>
              {!isOwnProfile ? (
                <Pressable
                  disabled={isMutatingFollow}
                  onPress={() => void handleFollowToggle()}
                  style={[
                    isFollowing ? styles.followingButton : styles.followButton,
                    isMutatingFollow ? styles.actionButtonDisabled : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.followButtonText,
                      isFollowing ? styles.followingButtonText : undefined,
                    ]}
                  >
                    {isMutatingFollow ? "Saving..." : isFollowing ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              ) : (
                <Link asChild href="/(app)/account">
                  <Pressable style={styles.followingButton}>
                    <Text style={[styles.followButtonText, styles.followingButtonText]}>
                      Open Account
                    </Text>
                  </Pressable>
                </Link>
              )}
            </View>
          </View>

          {errorMessage ? <Text style={styles.inlineStatus}>{errorMessage}</Text> : null}
          {statusMessage ? <Text style={styles.inlineStatus}>{statusMessage}</Text> : null}

          <View style={styles.gridDivider}>
            <View style={styles.gridHandle} />
          </View>

          {fits.length === 0 ? (
            <View style={[chrome.glassCardSoft, styles.stateCard]}>
              <Text style={styles.stateTitle}>No published fits yet</Text>
              <Text style={styles.stateText}>
                This profile has not published any fits yet.
              </Text>
            </View>
          ) : (
            <View style={styles.fitGrid}>
              {fits.map((fit) => (
                <ProfileGridTile
                  key={fit.id}
                  fit={fit}
                  onPress={() => {
                    router.push({
                      params: { creatorId: targetProfileId, postId: fit.id },
                      pathname: "/(app)",
                    });
                  }}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={[chrome.glassCardSoft, styles.stateCard]}>
          <Text style={styles.stateTitle}>Profile unavailable</Text>
          <Text style={styles.stateText}>
            {errorMessage || "We could not find that profile."}
          </Text>
          <Pressable
            onPress={() => void loadProfileScreen()}
            style={[chrome.primaryButton, styles.retryButton]}
          >
            <Text style={chrome.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButtonDisabled: {
    opacity: 0.72,
  },
  avatarRing: {
    alignItems: "center",
    backgroundColor: "rgba(251, 247, 241, 0.6)",
    borderColor: "rgba(188, 157, 126, 0.8)",
    borderRadius: 999,
    borderWidth: 3,
    justifyContent: "center",
    marginBottom: 10,
    padding: 4,
    shadowColor: "#9b7a63",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  container: {
    backgroundColor: theme.color.cream,
    flexGrow: 1,
    paddingHorizontal: 14,
  },
  fitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-start",
  },
  fitScorePill: {
    backgroundColor: "rgba(246, 233, 219, 0.78)",
    borderColor: "rgba(255,255,255,0.65)",
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute",
    right: 8,
    top: 8,
  },
  fitScoreText: {
    color: "#ca8b71",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 12,
    fontWeight: "600",
  },
  fitTile: {
    borderRadius: 16,
    height: 164,
    overflow: "hidden",
    position: "relative",
    width: "32.1%",
  },
  fitTilePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  fitTileImage: {
    height: "100%",
    width: "100%",
  },
  followButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    shadowColor: "#b28669",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  followButtonText: {
    color: theme.color.white,
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 15,
    fontWeight: "700",
  },
  followingButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 251, 247, 0.54)",
    borderColor: "rgba(208, 156, 128, 0.92)",
    borderRadius: theme.radius.pill,
    borderWidth: 1.8,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
    shadowColor: "#b28669",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  followingButtonText: {
    color: "#664636",
  },
  gridDivider: {
    alignItems: "center",
    borderTopColor: "rgba(210,178,148,0.62)",
    borderTopWidth: 1,
    marginBottom: 12,
    marginTop: 8,
    paddingTop: 8,
  },
  gridHandle: {
    backgroundColor: "rgba(222,203,181,0.95)",
    borderRadius: 999,
    height: 6,
    width: 54,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    width: "100%",
  },
  heroStat: {
    alignItems: "center",
    flex: 1,
  },
  heroStatLabel: {
    color: "#6e5648",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 15,
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 12,
    width: "100%",
  },
  heroStatValue: {
    color: "#5b4030",
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 23,
    fontWeight: "700",
  },
  inlineStatus: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 18,
    textAlign: "center",
  },
  profileBio: {
    color: "#6b5448",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 304,
    textAlign: "center",
  },
  profileHandle: {
    color: "#c0a186",
    fontFamily: Platform.select({ ios: "Avenir Next", default: undefined }),
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  profileHero: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 4,
    paddingTop: 16,
    position: "relative",
  },
  profileName: {
    color: "#654636",
    fontFamily: Platform.select({ ios: "Georgia-Bold", default: "serif" }),
    fontSize: 28,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 18,
    width: "100%",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  stateText: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  stateTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 8,
    position: "relative",
    zIndex: 3,
  },
});
