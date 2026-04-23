import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useFocusEffect } from "expo-router";

import {
  DEV_SEED_ENABLED,
  isModerationAdminUser,
  theme,
} from "../../src/constants";
import {
  getRecentOutboundClickDebugEntries,
  type OutboundClickDebugEntry,
} from "../../src/features/analytics";
import { useAuth } from "../../src/features/auth";
import {
  fetchMyPrivacyRequests,
  getPrivacyRequestLabel,
  PRIVACY_REQUEST_DETAILS_MAX_LENGTH,
  type PrivacyRequestRecord,
  type PrivacyRequestType,
  submitPrivacyRequest,
} from "../../src/features/privacy";
import { fetchMyReports, type ReportRecord } from "../../src/features/reports";
import {
  addCommentToPost,
  fetchFollowCounts,
  fetchProfileById,
  fetchProfileByUsername,
  fetchUserPosts,
  followUser,
  isFollowingProfile,
  isUuidLike,
  listCommentsForPost,
  type FollowCounts,
  type SocialComment,
  type SocialProfile,
  unfollowUser,
} from "../../src/features/social";
import { supabase } from "../../src/lib/supabaseClient";
import { BrandMark } from "../../src/ui";

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

function getRequestFailureMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

export default function AccountScreen() {
  const { profile, sessionLoaded, user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugClicks, setDebugClicks] = useState<OutboundClickDebugEntry[]>([]);
  const [debugReports, setDebugReports] = useState<ReportRecord[]>([]);
  const [isSubmittingPrivacy, setIsSubmittingPrivacy] = useState(false);
  const [privacyDetails, setPrivacyDetails] = useState("");
  const [privacyRequests, setPrivacyRequests] = useState<PrivacyRequestRecord[]>([]);
  const [privacySelection, setPrivacySelection] = useState<PrivacyRequestType | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<string | null>(null);
  const [socialComments, setSocialComments] = useState<SocialComment[]>([]);
  const [socialCommentText, setSocialCommentText] = useState("");
  const [socialCounts, setSocialCounts] = useState<FollowCounts | null>(null);
  const [socialIsFollowing, setSocialIsFollowing] = useState(false);
  const [socialPostId, setSocialPostId] = useState("");
  const [socialStatus, setSocialStatus] = useState<string | null>(null);
  const [socialTargetInput, setSocialTargetInput] = useState("");
  const [socialTargetPosts, setSocialTargetPosts] = useState(0);
  const [socialTargetProfile, setSocialTargetProfile] = useState<SocialProfile | null>(
    null
  );
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
            setPrivacyRequests([]);
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        setStatusMessage(null);
        try {
          const { data: posts, error: postsError } = await supabase
            .from("video_posts")
            .select("id, caption, created_at, status")
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false })
            .limit(12);

          if (postsError) {
            if (!cancelled) {
              setStatusMessage(`Failed to load profile stats: ${postsError.message}`);
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
          const [reportsResult, privacyRequestsResult] = await Promise.all([
            __DEV__ ? fetchMyReports(user.id) : Promise.resolve({ data: [], error: null }),
            fetchMyPrivacyRequests(user.id),
          ]);
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
          setPrivacyRequests(privacyRequestsResult.data);
          if (privacyRequestsResult.error && !cancelled) {
            setPrivacyStatus(privacyRequestsResult.error);
          }
        } catch (error) {
          if (!cancelled) {
            setStatusMessage(
              getRequestFailureMessage(error, "Failed to load profile stats")
            );
          }
          if (__DEV__) {
            console.error("Failed to load profile data", error);
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setStatusMessage(error.message);
        return;
      }

      setStatusMessage("Signed out.");
    } catch (error) {
      setStatusMessage(getRequestFailureMessage(error, "Sign out failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrivacySelection = (requestType: PrivacyRequestType) => {
    setPrivacySelection(requestType);
    setPrivacyStatus(null);
  };

  const handleSubmitPrivacyRequest = async () => {
    if (!user?.id || !privacySelection) {
      setPrivacyStatus("Choose a request type first.");
      return;
    }

    setIsSubmittingPrivacy(true);
    setPrivacyStatus(null);

    try {
      const result = await submitPrivacyRequest({
        details: privacyDetails,
        requesterId: user.id,
        requestType: privacySelection,
      });

      if (result.error) {
        setPrivacyStatus(result.error);
        return;
      }

      const reloadResult = await fetchMyPrivacyRequests(user.id);
      if (reloadResult.error) {
        setPrivacyStatus(reloadResult.error);
        return;
      }

      setPrivacyRequests(reloadResult.data);
      setPrivacyDetails("");
      setPrivacySelection(null);
      setPrivacyStatus(
        `${getPrivacyRequestLabel(
          privacySelection
        )} request submitted. We will handle this manually for MVP testing.`
      );
    } catch (error) {
      setPrivacyStatus(
        getRequestFailureMessage(error, "Could not submit privacy request")
      );
    } finally {
      setIsSubmittingPrivacy(false);
    }
  };

  const displayUsername = formatUsername(profile?.username ?? user?.email?.split("@")[0]);
  const canReviewReports = isModerationAdminUser(user?.id);

  const resolveSocialTarget = async () => {
    const trimmed = socialTargetInput.trim();
    if (!trimmed) {
      setSocialStatus("Enter a username or profile id.");
      return;
    }

    setSocialStatus(null);

    const profileResult = isUuidLike(trimmed)
      ? await fetchProfileById(trimmed)
      : await fetchProfileByUsername(trimmed);

    if (profileResult.error) {
      setSocialStatus(profileResult.error);
      return;
    }

    if (!profileResult.data) {
      setSocialTargetProfile(null);
      setSocialCounts(null);
      setSocialTargetPosts(0);
      setSocialIsFollowing(false);
      setSocialStatus("Profile not found.");
      return;
    }

    const [countsResult, followResult, postsResult] = await Promise.all([
      fetchFollowCounts(profileResult.data.id),
      user?.id
        ? isFollowingProfile(user.id, profileResult.data.id)
        : Promise.resolve({ data: false, error: null }),
      fetchUserPosts(profileResult.data.id, 6),
    ]);

    setSocialTargetProfile(profileResult.data);
    setSocialCounts(countsResult.data);
    setSocialIsFollowing(followResult.data);
    setSocialTargetPosts(postsResult.data.length);

    if (countsResult.error) {
      setSocialStatus(countsResult.error);
      return;
    }
    if (followResult.error) {
      setSocialStatus(followResult.error);
      return;
    }
    if (postsResult.error) {
      setSocialStatus(postsResult.error);
      return;
    }

    setSocialStatus("Profile loaded.");
  };

  const handleFollow = async () => {
    if (!user?.id || !socialTargetProfile) {
      setSocialStatus("Pick a target profile first.");
      return;
    }

    const result = await followUser(user.id, socialTargetProfile.id);
    if (result.error) {
      setSocialStatus(result.error);
      return;
    }

    const countsResult = await fetchFollowCounts(socialTargetProfile.id);
    setSocialCounts(countsResult.data);
    setSocialIsFollowing(true);
    setSocialStatus("Follow saved.");
  };

  const handleUnfollow = async () => {
    if (!user?.id || !socialTargetProfile) {
      setSocialStatus("Pick a target profile first.");
      return;
    }

    const result = await unfollowUser(user.id, socialTargetProfile.id);
    if (result.error) {
      setSocialStatus(result.error);
      return;
    }

    const countsResult = await fetchFollowCounts(socialTargetProfile.id);
    setSocialCounts(countsResult.data);
    setSocialIsFollowing(false);
    setSocialStatus("Follow removed.");
  };

  const handleLoadComments = async () => {
    const trimmedPostId = socialPostId.trim();
    if (!trimmedPostId) {
      setSocialStatus("Enter a post id.");
      return;
    }

    const result = await listCommentsForPost(trimmedPostId);
    if (result.error) {
      setSocialStatus(result.error);
      return;
    }

    setSocialComments(result.data);
    setSocialStatus(`Loaded ${result.data.length} comments.`);
  };

  const handleAddComment = async () => {
    const trimmedPostId = socialPostId.trim();
    if (!user?.id || !trimmedPostId) {
      setSocialStatus("Enter a post id first.");
      return;
    }

    const result = await addCommentToPost(trimmedPostId, user.id, socialCommentText);
    if (result.error) {
      setSocialStatus(result.error);
      return;
    }

    setSocialCommentText("");
    const reloadResult = await listCommentsForPost(trimmedPostId);
    if (reloadResult.error) {
      setSocialStatus(reloadResult.error);
      return;
    }

    setSocialComments(reloadResult.data);
    setSocialStatus("Comment added.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroGlow} />

      <View style={styles.headerRow}>
        <Text style={styles.heading}>@{displayUsername}</Text>
        <View style={styles.headerActions}>
          <Link asChild href="/(app)/search">
            <Pressable style={styles.headerPill}>
              <Text style={styles.headerPillText}>Search</Text>
            </Pressable>
          </Link>
          <View style={styles.settingsButton}>
            <Text style={styles.settingsGlyph}>⚙</Text>
          </View>
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
          <BrandMark elevated size={92} variant="chrome" />
          <Text style={styles.monogramCopy}>Your profile, fits, and score summary.</Text>
        </View>
      </View>

      {user?.id ? (
        <View style={styles.profileActionsRow}>
          <Link asChild href={`/(app)/profile/${user.id}`}>
            <Pressable style={styles.profileActionButton}>
              <Text style={styles.profileActionText}>View public profile</Text>
            </Pressable>
          </Link>
          <Link asChild href="/(app)/search">
            <Pressable style={[styles.profileActionButton, styles.profileActionButtonGhost]}>
              <Text
                style={[styles.profileActionText, styles.profileActionTextGhost]}
              >
                Search people
              </Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      {canReviewReports ? (
        <Link asChild href="/(app)/moderation/reports">
          <Pressable style={styles.moderationLink}>
            <Text style={styles.moderationLinkText}>Open reports review</Text>
          </Pressable>
        </Link>
      ) : null}

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

        <Text style={styles.infoLabel}>Session loaded</Text>
        <Text style={styles.infoValue}>{sessionLoaded ? "yes" : "no"}</Text>

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

      <View style={styles.privacyCard}>
        <Text style={styles.privacyHeading}>Privacy requests</Text>
        <Text style={styles.privacyCopy}>
          For MVP testing, account deletion and data export are handled as manual support
          requests. Submitting one stores your request in Redress so it can be reviewed and
          completed outside the app.
        </Text>

        <Text style={styles.privacyLabel}>Optional note</Text>
        <TextInput
          multiline
          onChangeText={setPrivacyDetails}
          placeholder="Add context for support if needed"
          placeholderTextColor={theme.color.inkSoft}
          style={styles.privacyInput}
          textAlignVertical="top"
          value={privacyDetails}
        />
        <Text style={styles.privacyHint}>
          {privacyDetails.trim().length}/{PRIVACY_REQUEST_DETAILS_MAX_LENGTH}
        </Text>

        <View style={styles.profileActionsRow}>
          <Pressable
            onPress={() => handlePrivacySelection("account_deletion")}
            style={[
              styles.profileActionButton,
              privacySelection === "account_deletion"
                ? undefined
                : styles.profileActionButtonGhost,
            ]}
          >
            <Text
              style={[
                styles.profileActionText,
                privacySelection === "account_deletion"
                  ? undefined
                  : styles.profileActionTextGhost,
              ]}
            >
              Request account deletion
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handlePrivacySelection("data_export")}
            style={[
              styles.profileActionButton,
              privacySelection === "data_export"
                ? undefined
                : styles.profileActionButtonGhost,
            ]}
          >
            <Text
              style={[
                styles.profileActionText,
                privacySelection === "data_export"
                  ? undefined
                  : styles.profileActionTextGhost,
              ]}
            >
              Request data export
            </Text>
          </Pressable>
        </View>

        {privacySelection ? (
          <View style={styles.privacyConfirmCard}>
            <Text style={styles.privacyConfirmTitle}>
              Confirm {getPrivacyRequestLabel(privacySelection).toLowerCase()}
            </Text>
            <Text style={styles.privacyConfirmCopy}>
              {privacySelection === "account_deletion"
                ? "This creates a manual deletion request for your account and related Redress data. The actual deletion is not instant in the MVP app."
                : "This creates a manual export request for the data currently associated with your Redress account. The export is not generated instantly in the MVP app."}
            </Text>
            <View style={styles.debugButtonRow}>
              <Pressable
                onPress={handleSubmitPrivacyRequest}
                disabled={isSubmittingPrivacy}
                style={[
                  styles.debugButton,
                  isSubmittingPrivacy ? styles.debugButtonDisabled : undefined,
                ]}
              >
                <Text style={styles.debugButtonText}>
                  {isSubmittingPrivacy ? "Submitting..." : "Confirm request"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPrivacySelection(null);
                  setPrivacyStatus(null);
                }}
                style={[styles.debugButton, styles.profileActionButtonGhost]}
              >
                <Text style={[styles.debugButtonText, styles.profileActionTextGhost]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.privacyHistory}>
          <Text style={styles.privacyLabel}>Recent requests</Text>
          {privacyRequests.length === 0 ? (
            <Text style={styles.privacyEmpty}>No privacy requests submitted yet.</Text>
          ) : (
            privacyRequests.map((request) => (
              <View key={request.id} style={styles.privacyHistoryRow}>
                <Text style={styles.privacyHistoryTitle}>
                  {getPrivacyRequestLabel(request.request_type)}
                </Text>
                <Text style={styles.privacyHistoryMeta}>
                  {request.status} · {new Date(request.created_at).toLocaleString()}
                </Text>
                {request.details ? (
                  <Text style={styles.privacyHistoryDetails}>{request.details}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {privacyStatus ? <Text style={styles.status}>{privacyStatus}</Text> : null}
      </View>

      {DEV_SEED_ENABLED ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugHeading}>Dev: seed database</Text>
          <Text style={styles.debugHint}>
            Open the seeding guide and use `supabase/seed.sql` from SQL Editor.
          </Text>
          <Link href="/(app)/dev-seed" style={styles.debugLink}>
            Seed database instructions
          </Link>
        </View>
      ) : null}

      {__DEV__ ? (
        <View style={styles.debugCard}>
          <Text style={styles.debugHeading}>Dev: social debug</Text>
          <Text style={styles.debugHint}>
            Current user: @{displayUsername} · {user?.id ?? "-"}
          </Text>

          <Text style={styles.debugLabel}>Target username or profile id</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setSocialTargetInput}
            placeholder="username or uuid"
            placeholderTextColor={theme.color.inkSoft}
            style={styles.debugInput}
            value={socialTargetInput}
          />

          <View style={styles.debugButtonRow}>
            <Pressable onPress={() => void resolveSocialTarget()} style={styles.debugButton}>
              <Text style={styles.debugButtonText}>Load profile</Text>
            </Pressable>
            <Pressable
              disabled={!socialTargetProfile || socialIsFollowing}
              onPress={() => void handleFollow()}
              style={[
                styles.debugButton,
                !socialTargetProfile || socialIsFollowing
                  ? styles.debugButtonDisabled
                  : undefined,
              ]}
            >
              <Text style={styles.debugButtonText}>Follow</Text>
            </Pressable>
            <Pressable
              disabled={!socialTargetProfile || !socialIsFollowing}
              onPress={() => void handleUnfollow()}
              style={[
                styles.debugButton,
                !socialTargetProfile || !socialIsFollowing
                  ? styles.debugButtonDisabled
                  : undefined,
              ]}
            >
              <Text style={styles.debugButtonText}>Unfollow</Text>
            </Pressable>
          </View>

          {socialTargetProfile ? (
            <View style={styles.debugRow}>
              <Text style={styles.debugValue}>id: {socialTargetProfile.id}</Text>
              <Text style={styles.debugValue}>
                username: @{socialTargetProfile.username}
              </Text>
              <Text style={styles.debugValue}>
                followers: {socialCounts?.followersCount ?? 0}
              </Text>
              <Text style={styles.debugValue}>
                following: {socialCounts?.followingCount ?? 0}
              </Text>
              <Text style={styles.debugValue}>
                published posts: {socialTargetPosts}
              </Text>
              <Text style={styles.debugValue}>
                current user follows: {socialIsFollowing ? "yes" : "no"}
              </Text>
            </View>
          ) : null}

          <Text style={styles.debugLabel}>Comments post id</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setSocialPostId}
            placeholder="published post uuid"
            placeholderTextColor={theme.color.inkSoft}
            style={styles.debugInput}
            value={socialPostId}
          />

          <Text style={styles.debugLabel}>Add comment</Text>
          <TextInput
            multiline
            onChangeText={setSocialCommentText}
            placeholder="Write a test comment"
            placeholderTextColor={theme.color.inkSoft}
            style={[styles.debugInput, styles.debugInputTall]}
            textAlignVertical="top"
            value={socialCommentText}
          />

          <View style={styles.debugButtonRow}>
            <Pressable onPress={() => void handleLoadComments()} style={styles.debugButton}>
              <Text style={styles.debugButtonText}>Load comments</Text>
            </Pressable>
            <Pressable onPress={() => void handleAddComment()} style={styles.debugButton}>
              <Text style={styles.debugButtonText}>Add comment</Text>
            </Pressable>
          </View>

          {socialComments.length === 0 ? (
            <Text style={styles.debugEmpty}>No loaded comments yet.</Text>
          ) : (
            socialComments.map((comment) => (
              <View key={comment.id} style={styles.debugRow}>
                <Text style={styles.debugValue}>
                  @{comment.user.username} · {comment.created_at}
                </Text>
                <Text style={styles.debugValue}>post: {comment.post_id}</Text>
                <Text style={styles.debugValue}>{comment.text}</Text>
              </View>
            ))
          )}

          {socialStatus ? <Text style={styles.status}>{socialStatus}</Text> : null}
        </View>
      ) : null}

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
    paddingBottom: 120,
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
  debugButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    paddingVertical: 10,
  },
  debugButtonDisabled: {
    opacity: 0.5,
  },
  debugButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  debugButtonText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  debugInput: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    marginTop: 6,
    padding: 12,
  },
  debugInputTall: {
    minHeight: 88,
  },
  debugLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
  },
  debugLink: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
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
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
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
    backgroundColor: "rgba(232,221,208,0.92)",
    borderColor: "rgba(216,206,194,0.7)",
    borderRadius: 22,
    borderWidth: 1,
    height: 170,
    marginRight: 14,
    padding: 18,
    width: 176,
  },
  fitTileAccent: {
    backgroundColor: "#b14a44",
  },
  fitTileInk: {
    backgroundColor: "#7d6a5f",
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
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerPillText: {
    color: theme.color.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  heading: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: "rgba(232,221,208,0.82)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 320,
    overflow: "hidden",
    padding: 22,
  },
  heroGlow: {
    backgroundColor: "rgba(236, 221, 205, 0.62)",
    borderRadius: 260,
    height: 280,
    position: "absolute",
    right: -20,
    top: 94,
    width: 280,
  },
  heroSplit: {
    backgroundColor: "rgba(255,255,255,0.16)",
    height: "128%",
    position: "absolute",
    right: "42%",
    top: -18,
    transform: [{ rotate: "6deg" }],
    width: 1,
  },
  infoCard: {
    backgroundColor: "rgba(255,249,243,0.86)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
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
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
  },
  loadingText: {
    color: theme.color.inkSoft,
    marginTop: 10,
  },
  monogramCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    textAlign: "center",
    width: 180,
  },
  monogramWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingLeft: 12,
  },
  moderationLink: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 12,
  },
  moderationLinkText: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  privacyCard: {
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 18,
  },
  privacyConfirmCard: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  privacyConfirmCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  privacyConfirmTitle: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  privacyCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  privacyEmpty: {
    color: theme.color.muted,
    marginTop: 8,
  },
  privacyHeading: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
  },
  privacyHint: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: "right",
  },
  privacyHistory: {
    marginTop: 16,
  },
  privacyHistoryDetails: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 4,
  },
  privacyHistoryMeta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  privacyHistoryRow: {
    borderTopColor: theme.color.border,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  privacyHistoryTitle: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  privacyInput: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    marginTop: 6,
    minHeight: 88,
    padding: 12,
  },
  privacyLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 14,
  },
  profileActionButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  profileActionButtonGhost: {
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.88)",
    borderWidth: 1,
  },
  profileActionText: {
    color: theme.color.white,
    fontSize: 14,
    fontWeight: "700",
  },
  profileActionTextGhost: {
    color: theme.color.ink,
  },
  profileActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
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
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
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
    backgroundColor: "rgba(255,249,243,0.76)",
    borderColor: "rgba(216,206,194,0.7)",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statLabel: {
    color: theme.color.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  statValue: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "700",
  },
  statValueAccent: {
    color: theme.color.accentBright,
  },
  statsColumn: {
    paddingRight: 16,
    width: 168,
    zIndex: 1,
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 12,
    textAlign: "center",
  },
});
