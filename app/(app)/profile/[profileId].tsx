import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { ProfileAvatar } from "../../../src/ui";

const EMPTY_COUNTS: FollowCounts = {
  followersCount: 0,
  followingCount: 0,
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export default function ProfileScreen() {
  const { profileId } = useLocalSearchParams<{ profileId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const targetProfileId = typeof profileId === "string" ? profileId : "";
  const isOwnProfile = Boolean(user?.id && user.id === targetProfileId);

  const [counts, setCounts] = useState<FollowCounts>(EMPTY_COUNTS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutatingFollow, setIsMutatingFollow] = useState(false);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadProfileScreen = useCallback(async () => {
    if (!targetProfileId) {
      setProfile(null);
      setPosts([]);
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

    setProfile(profileResult.data);
    setCounts(countsResult.data);
    setPosts(postsResult.data);
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
          paddingTop: Math.max(insets.top + 12, 28),
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>

        <Link asChild href="/(app)/search">
          <Pressable style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Search</Text>
          </Pressable>
        </Link>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.stateText}>Loading profile…</Text>
        </View>
      ) : profile ? (
        <>
          <View style={styles.profileCard}>
            <ProfileAvatar
              avatarUrl={profile.avatar_url}
              size={96}
              username={profile.username}
            />

            <Text style={styles.username}>@{profile.username}</Text>

            <Text style={styles.bio}>
              {profile.bio?.trim() || "No bio added yet."}
            </Text>

            <View style={styles.countsRow}>
              <View style={styles.countCard}>
                <Text style={styles.countValue}>{counts.followersCount}</Text>
                <Text style={styles.countLabel}>Followers</Text>
              </View>
              <View style={styles.countCard}>
                <Text style={styles.countValue}>{counts.followingCount}</Text>
                <Text style={styles.countLabel}>Following</Text>
              </View>
              <View style={styles.countCard}>
                <Text style={styles.countValue}>{posts.length}</Text>
                <Text style={styles.countLabel}>Posts</Text>
              </View>
            </View>

            {!isOwnProfile ? (
              <Pressable
                disabled={isMutatingFollow}
                onPress={() => void handleFollowToggle()}
                style={[
                  styles.followButton,
                  isFollowing ? styles.followButtonSecondary : undefined,
                  isMutatingFollow ? styles.followButtonDisabled : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.followButtonText,
                    isFollowing ? styles.followButtonTextSecondary : undefined,
                  ]}
                >
                  {isMutatingFollow
                    ? "Saving..."
                    : isFollowing
                      ? "Unfollow"
                      : "Follow"}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.ownProfileCopy}>This is your public profile.</Text>
            )}
          </View>

          {errorMessage ? <Text style={styles.inlineMessage}>{errorMessage}</Text> : null}
          {statusMessage ? <Text style={styles.inlineMessage}>{statusMessage}</Text> : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Published fits</Text>
            <Text style={styles.sectionMeta}>{posts.length} total</Text>
          </View>

          {posts.length === 0 ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>No published posts yet</Text>
              <Text style={styles.stateText}>
                This profile has not published any fits yet.
              </Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postMediaPlaceholder}>
                    <Text style={styles.postMediaLabel}>Published fit</Text>
                  </View>
                  <Text numberOfLines={2} style={styles.postCaption}>
                    {post.caption.trim() || "Untitled fit"}
                  </Text>
                  <Text style={styles.postMeta}>{formatDate(post.created_at)}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Profile unavailable</Text>
          <Text style={styles.stateText}>
            {errorMessage || "We could not find that profile."}
          </Text>
          <Pressable onPress={() => void loadProfileScreen()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bio: {
    color: theme.color.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  countCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 88,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  countLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 6,
  },
  countValue: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  countsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  followButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingVertical: 13,
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followButtonSecondary: {
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderWidth: 1,
  },
  followButtonText: {
    color: theme.color.white,
    fontSize: 14,
    fontWeight: "700",
  },
  followButtonTextSecondary: {
    color: theme.color.ink,
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
  inlineMessage: {
    color: theme.color.inkSoft,
    marginTop: 12,
    textAlign: "center",
  },
  ownProfileCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
  postCaption: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 14,
  },
  postCard: {
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    width: "48%",
  },
  postMediaLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  postMediaPlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(232,221,208,0.9)",
    borderRadius: 18,
    height: 126,
    justifyContent: "center",
  },
  postMeta: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 6,
  },
  postsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  profileCard: {
    backgroundColor: "rgba(232,221,208,0.82)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingVertical: 13,
  },
  retryButtonText: {
    color: theme.color.white,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 28,
  },
  sectionMeta: {
    color: theme.color.inkSoft,
    fontSize: 13,
  },
  sectionTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
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
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  username: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
});
