import { Link, useFocusEffect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";

import { theme } from "../../src/constants";
import {
  logPostImpressionBestEffort,
  logOutboundClickBestEffort,
  logTagRevealBestEffort,
  shouldLogOutboundClick,
} from "../../src/features/analytics";
import { useAuth } from "../../src/features/auth";
import {
  addCommentToPost,
  COMMENT_MAX_LENGTH,
  fetchCommentCountsForPosts,
  listCommentsForPost,
  type SocialComment,
} from "../../src/features/social";
import {
  buildLinkReportDetails,
  ReportComposer,
  submitReport,
  type ReportTargetType,
} from "../../src/features/reports";
import { supabase } from "../../src/lib/supabaseClient";
import { GradeSlider, ProfileAvatar } from "../../src/ui";
import { validateClothingTagUrl } from "../../src/utils";

const PAGE_SIZE = 8;

type FeedTag = {
  brand: string | null;
  category: string | null;
  id: string;
  name: string;
  url: string | null;
};

type FeedPost = {
  caption: string;
  created_at: string;
  creator_id: string;
  creator_username: string;
  id: string;
  tags: FeedTag[];
  video_url: string;
};

type ReportDraft = {
  initialDetails?: string;
  subtitle: string;
  targetId: string;
  targetType: ReportTargetType;
  title: string;
};

type CommentsSheetProps = {
  comments: SocialComment[];
  composerMessage: string | null;
  composerText: string;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  onChangeComposerText: (value: string) => void;
  onClose: () => void;
  onRefresh: () => void;
  onSubmit: () => void;
  post: FeedPost | null;
  visible: boolean;
};

type FeedVideoCardProps = {
  active: boolean;
  avgGradeText: string;
  captionExpanded: boolean;
  commentCount: number;
  gradeCount: number;
  height: number;
  onOpenComments: () => void;
  onOpenGradeSheet: () => void;
  onOpenProfile: () => void;
  onReportPost: () => void;
  onReportProfile: () => void;
  onRevealItems: () => void;
  onToggleCaption: () => void;
  post: FeedPost;
  shouldMountVideo: boolean;
  topInset: number;
  userGrade: number | null;
};

function getCaptionPreview(caption: string) {
  const fallback = "Fresh fit, no caption yet.";
  const source = caption.trim().length > 0 ? caption.trim() : fallback;

  if (source.length <= 88) {
    return {
      text: source,
      truncated: false,
    };
  }

  return {
    text: `${source.slice(0, 88).trimEnd()}…`,
    truncated: true,
  };
}

function FeedVideoCard({
  active,
  avgGradeText,
  captionExpanded,
  commentCount,
  gradeCount,
  height,
  onOpenComments,
  onOpenGradeSheet,
  onOpenProfile,
  onReportPost,
  onReportProfile,
  onRevealItems,
  onToggleCaption,
  post,
  shouldMountVideo,
  topInset,
  userGrade,
}: FeedVideoCardProps) {
  const player = useVideoPlayer(shouldMountVideo ? post.video_url : null, (videoPlayer) => {
    videoPlayer.loop = true;
  });
  const captionPreview = getCaptionPreview(post.caption);
  const captionText = captionExpanded
    ? post.caption.trim() || "Fresh fit, no caption yet."
    : captionPreview.text;
  const creatorLabel = post.creator_username.trim().toUpperCase();
  const avatarFallback = post.creator_username.charAt(0).toUpperCase();
  const taggedItemCopy =
    post.tags.length === 1 ? "1 tagged item" : `${post.tags.length} tagged items`;

  useEffect(() => {
    if (!shouldMountVideo) {
      return;
    }
    if (active) {
      videoPlayerSafePlay(player);
      return;
    }
    player.pause();
  }, [active, player, shouldMountVideo]);

  return (
    <View style={[styles.cardWrap, { height }]}>
      {shouldMountVideo ? (
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />
      ) : (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <Text style={styles.placeholderText}>Loading…</Text>
        </View>
      )}

      <View style={styles.videoTint} />
      <View style={[styles.creatorCardWrap, { top: topInset + 4 }]}>
        <View style={styles.creatorCard}>
          <Pressable onPress={onOpenProfile} style={styles.creatorMainTap}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>{avatarFallback}</Text>
            </View>
            <View style={styles.creatorMeta}>
              <Text numberOfLines={1} style={styles.creatorName}>
                {creatorLabel}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={onReportProfile} style={styles.creatorButton}>
            <Text style={styles.creatorButtonText}>Report</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sideRail}>
        <Pressable onPress={onRevealItems} style={styles.sidePill}>
          <Text style={styles.sidePillLabel}>Items</Text>
          <Text style={styles.sidePillSubLabel}>{taggedItemCopy}</Text>
        </Pressable>

        <Pressable onPress={onOpenGradeSheet} style={styles.scoreCard}>
          <Text style={styles.scoreCardValue}>{avgGradeText}</Text>
          <Text style={styles.scoreCardSub}>
            {gradeCount > 0 ? String(gradeCount) : "Rate"}
          </Text>
          {userGrade != null ? (
            <Text style={styles.scoreCardHint}>Yours {userGrade}</Text>
          ) : (
            <Text style={styles.scoreCardHint}>Tap to rate</Text>
          )}
        </Pressable>

        <Pressable onPress={onOpenComments} style={styles.sideIconButton}>
          <Text style={styles.sideIconButtonText}>Comments</Text>
          <Text style={styles.sideIconButtonSubText}>
            {commentCount > 0 ? String(commentCount) : "Add"}
          </Text>
        </Pressable>

        <Pressable onPress={onReportPost} style={styles.sideIconButton}>
          <Text style={styles.sideIconButtonText}>Report</Text>
        </Pressable>
      </View>

      <View style={styles.bottomOverlay}>
        <View style={styles.captionCard}>
          <Pressable onPress={onOpenProfile}>
            <Text style={styles.bottomUsername}>@{post.creator_username}</Text>
          </Pressable>
          <Pressable onPress={onToggleCaption}>
            <Text numberOfLines={captionExpanded ? 4 : 2} style={styles.caption}>
              {captionText}
            </Text>
            {captionPreview.truncated ? (
              <Text style={styles.expandCopy}>
                {captionExpanded ? "Show less" : "More"}
              </Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function videoPlayerSafePlay(player: { play: () => void }) {
  try {
    player.play();
  } catch {
    // no-op for occasional player race during mount/unmount
  }
}

function videoPlayerSafePause(player: { pause: () => void }) {
  try {
    player.pause();
  } catch {
    // no-op for occasional player race during mount/unmount
  }
}

function getRequestFailureMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

function formatCommentTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return date.toLocaleDateString();
}

function sortCommentsOldestFirst(comments: SocialComment[]) {
  return [...comments].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function CommentsSheet({
  comments,
  composerMessage,
  composerText,
  isLoading,
  isRefreshing,
  isSubmitting,
  onChangeComposerText,
  onClose,
  onRefresh,
  onSubmit,
  post,
  visible,
}: CommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const previewPlayer = useVideoPlayer(visible && post ? post.video_url : null, (player) => {
    player.loop = true;
  });
  const remainingCharacters = COMMENT_MAX_LENGTH - composerText.length;

  useEffect(() => {
    if (!visible || !post) {
      videoPlayerSafePause(previewPlayer);
      return;
    }

    videoPlayerSafePlay(previewPlayer);
    return () => {
      videoPlayerSafePause(previewPlayer);
    };
  }, [post, previewPlayer, visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.commentsModalRoot}
      >
        <Pressable
          style={styles.commentsBackdrop}
          onPress={() => {
            Keyboard.dismiss();
          }}
        >
          <Pressable style={styles.commentsPreviewWrap} onPress={() => {}}>
            {post ? (
              <View style={styles.commentsPreviewCard}>
                <VideoView
                  player={previewPlayer}
                  style={styles.commentsPreviewVideo}
                  contentFit="cover"
                  nativeControls={false}
                />
                <View style={styles.commentsPreviewTint} />
                <View style={styles.commentsPreviewMeta}>
                  <Text style={styles.commentsPreviewUsername}>
                    @{post.creator_username}
                  </Text>
                  <Text numberOfLines={2} style={styles.commentsPreviewCaption}>
                    {post.caption.trim() || "Fresh fit, no caption yet."}
                  </Text>
                </View>
              </View>
            ) : null}
          </Pressable>

          <Pressable style={styles.commentsPanel} onPress={() => {}}>
            <View style={styles.commentsHandle} />
            <View style={styles.commentsHeaderRow}>
              <Text style={styles.commentsTitle}>
                {comments.length === 1 ? "1 comment" : `${comments.length} comments`}
              </Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                style={styles.commentsCloseButton}
              >
                <Text style={styles.commentsCloseText}>Done</Text>
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.commentsStateWrap}>
                <ActivityIndicator color={theme.color.accentBright} />
                <Text style={styles.commentsStateText}>Loading comments…</Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor={theme.color.accentBright}
                  />
                }
                renderItem={({ item }) => (
                  <View style={styles.commentRow}>
                    <ProfileAvatar
                      avatarUrl={item.user.avatar_url}
                      size={38}
                      username={item.user.username}
                    />
                    <View style={styles.commentBody}>
                      <View style={styles.commentMetaRow}>
                        <Text style={styles.commentUsername}>
                          @{item.user.username}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatCommentTime(item.created_at)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
                contentContainerStyle={[
                  styles.commentsListContent,
                  {
                    paddingBottom: Math.max(insets.bottom + 94, 112),
                  },
                ]}
                ListEmptyComponent={
                  <View style={styles.commentsEmptyWrap}>
                    <Text style={styles.commentsEmptyTitle}>No comments yet</Text>
                    <Text style={styles.commentsEmptyText}>
                      Start the conversation with the first comment.
                    </Text>
                  </View>
                }
              />
            )}

            <View style={styles.commentsComposer}>
              <TextInput
                value={composerText}
                onChangeText={onChangeComposerText}
                onSubmitEditing={() => Keyboard.dismiss()}
                placeholder="Add a comment"
                placeholderTextColor={theme.color.inkSoft}
                style={styles.commentsInput}
                blurOnSubmit
                multiline
                maxLength={COMMENT_MAX_LENGTH}
                textAlignVertical="top"
                returnKeyType="done"
              />

              <View style={styles.commentsComposerFooter}>
                <Text style={styles.commentsCharacterCount}>{remainingCharacters}</Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onSubmit();
                  }}
                  disabled={isSubmitting}
                  style={[
                    styles.commentsSendButton,
                    isSubmitting ? styles.commentsSendButtonDisabled : undefined,
                  ]}
                >
                  <Text style={styles.commentsSendText}>
                    {isSubmitting ? "Sending..." : "Send"}
                  </Text>
                </Pressable>
              </View>

              {composerMessage ? (
                <Text style={styles.commentsComposerMessage}>{composerMessage}</Text>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardHeight = Math.max(height, 560);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [isFeedFocused, setIsFeedFocused] = useState(true);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [expandedCaptionPostId, setExpandedCaptionPostId] = useState<string | null>(
    null
  );
  const [gradeSheetVisible, setGradeSheetVisible] = useState(false);
  const [gradeSheetPostId, setGradeSheetPostId] = useState<string | null>(null);
  const [gradeDraftValue, setGradeDraftValue] = useState(5);
  const [gradeMessageByPost, setGradeMessageByPost] = useState<
    Record<string, string | null>
  >({});
  const [gradeSubmittingPostId, setGradeSubmittingPostId] = useState<
    string | null
  >(null);
  const [gradeStatsByPost, setGradeStatsByPost] = useState<
    Record<string, { avg: number | null; count: number; userGrade: number | null }>
  >({});
  const [commentCountsByPost, setCommentCountsByPost] = useState<Record<string, number>>(
    {}
  );
  const [commentsComposerMessage, setCommentsComposerMessage] = useState<string | null>(
    null
  );
  const [commentsComposerText, setCommentsComposerText] = useState("");
  const [commentsForSheet, setCommentsForSheet] = useState<SocialComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsRefreshing, setCommentsRefreshing] = useState(false);
  const [commentsSheetPostId, setCommentsSheetPostId] = useState<string | null>(null);
  const [commentsSheetVisible, setCommentsSheetVisible] = useState(false);
  const [commentsSubmitting, setCommentsSubmitting] = useState(false);
  const gradeCooldownUntilRef = useRef<Record<string, number>>({});
  const commentCooldownUntilRef = useRef<Record<string, number>>({});

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
    }: {
      changed: Array<{ index: number | null }>;
      viewableItems: Array<{ index: number | null }>;
    }) => {
      const topItem = viewableItems[0];
      if (!topItem || topItem.index == null) {
        return;
      }
      setActiveIndex(topItem.index);
    }
  ).current;

  const activePost = posts[activeIndex] ?? null;
  const gradeSheetPost =
    posts.find((post) => post.id === gradeSheetPostId) ?? activePost ?? null;
  const gradeSheetStats = gradeSheetPost
    ? gradeStatsByPost[gradeSheetPost.id]
    : undefined;
  const commentsSheetPost =
    posts.find((post) => post.id === commentsSheetPostId) ?? activePost ?? null;

  const openReportComposer = (draft: ReportDraft) => {
    setReportDraft(draft);
    setReportMessage(null);
  };

  const refreshGradeStats = async (postIds: string[]) => {
    if (postIds.length === 0) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from("grades")
        .select("post_id, user_id, value")
        .in("post_id", postIds);

      if (error) {
        return;
      }

      const nextStats: Record<
        string,
        { avg: number | null; count: number; userGrade: number | null }
      > = {};
      postIds.forEach((postId) => {
        nextStats[postId] = { avg: null, count: 0, userGrade: null };
      });

      const sumMap: Record<string, number> = {};
      (data ?? []).forEach((row) => {
        const postId = String(row.post_id);
        if (!nextStats[postId]) {
          nextStats[postId] = { avg: null, count: 0, userGrade: null };
        }
        sumMap[postId] = (sumMap[postId] ?? 0) + row.value;
        nextStats[postId].count += 1;
        if (user?.id && row.user_id === user.id) {
          nextStats[postId].userGrade = row.value;
        }
      });

      Object.keys(nextStats).forEach((postId) => {
        const count = nextStats[postId].count;
        if (count > 0) {
          const avgRaw = (sumMap[postId] ?? 0) / count;
          nextStats[postId].avg = Math.round(avgRaw * 10) / 10;
        }
      });

      setGradeStatsByPost((current) => ({
        ...current,
        ...nextStats,
      }));
    } catch (error) {
      if (__DEV__) {
        console.error("Failed to refresh grade stats", error);
      }
    }
  };

  const refreshCommentCounts = async (postIds: string[]) => {
    if (postIds.length === 0) {
      return;
    }

    const result = await fetchCommentCountsForPosts(postIds);
    if (result.error) {
      if (__DEV__) {
        console.error("Failed to refresh comment counts", result.error);
      }
      return;
    }

    setCommentCountsByPost((current) => ({
      ...current,
      ...result.data,
    }));
  };

  const loadCommentsForPost = async (
    postId: string,
    mode: "initial" | "refresh" | "silent" = "initial"
  ) => {
    if (mode === "initial") {
      setCommentsLoading(true);
    }
    if (mode === "refresh") {
      setCommentsRefreshing(true);
    }

    const result = await listCommentsForPost(postId, 100);
    if (result.error) {
      setCommentsComposerMessage(result.error);
      if (__DEV__) {
        console.error("Failed to load comments", result.error);
      }
      setCommentsLoading(false);
      setCommentsRefreshing(false);
      return;
    }

    setCommentsForSheet(sortCommentsOldestFirst(result.data));
    setCommentsComposerMessage(null);
    setCommentsLoading(false);
    setCommentsRefreshing(false);
    await refreshCommentCounts([postId]);
  };

  useFocusEffect(
    useCallback(() => {
      setIsFeedFocused(true);
      if (posts.length === 0 && !isLoading) {
        void loadPosts(0, true);
      } else if (posts.length > 0) {
        void refreshCommentCounts(posts.map((post) => post.id));
      }
      return () => {
        setIsFeedFocused(false);
      };
    }, [isLoading, posts])
  );

  const loadPosts = async (nextOffset: number, reset: boolean) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setFeedMessage(null);
    try {
      const rangeFrom = nextOffset;
      const rangeTo = nextOffset + PAGE_SIZE - 1;

      const { data: rawPosts, error: postsError } = await supabase
        .from("video_posts")
        .select(
          "id, creator_id, caption, created_at, video_url, clothing_tags(id, name, brand, category, url)"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(rangeFrom, rangeTo);

      if (postsError) {
        setFeedMessage(`Failed to load feed: ${postsError.message}`);
        return;
      }

      const creatorIds = Array.from(
        new Set((rawPosts ?? []).map((post) => String(post.creator_id)))
      );

      let usernameMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", creatorIds);

        usernameMap = new Map(
          (profilesData ?? []).map((profile) => [profile.id, profile.username])
        );
      }

      const mappedPosts: FeedPost[] = (rawPosts ?? []).map((post) => ({
        caption: post.caption ?? "",
        created_at: post.created_at,
        creator_id: String(post.creator_id),
        creator_username:
          usernameMap.get(String(post.creator_id)) ?? String(post.creator_id).slice(0, 8),
        id: post.id,
        tags: (post.clothing_tags ?? []) as FeedTag[],
        video_url: post.video_url,
      }));

      setPosts((current) => {
        if (reset) {
          return mappedPosts;
        }
        const known = new Set(current.map((post) => post.id));
        const deduped = mappedPosts.filter((post) => !known.has(post.id));
        return [...current, ...deduped];
      });

      setOffset(nextOffset + mappedPosts.length);
      setHasMore(mappedPosts.length === PAGE_SIZE);

      const knownIds = posts.map((post) => post.id);
      const mergedIds = Array.from(
        new Set(
          reset
            ? mappedPosts.map((post) => post.id)
            : [...knownIds, ...mappedPosts.map((post) => post.id)]
        )
      );
      await refreshGradeStats(mergedIds);
      await refreshCommentCounts(mergedIds);
    } catch (error) {
      setFeedMessage(getRequestFailureMessage(error, "Failed to load feed"));
      if (__DEV__) {
        console.error("Failed to load feed", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts(0, true);
  }, []);

  useEffect(() => {
    if (!isFeedFocused || !activePost?.id || !user?.id) {
      return;
    }

    void logPostImpressionBestEffort({
      postId: activePost.id,
      userId: user.id,
    }).then((result) => {
      if (__DEV__ && result.error) {
        console.error("Failed to log post impression", result.error);
      }
    });
  }, [activePost?.id, isFeedFocused, user?.id]);

  const insertGradeDirect = async (postId: string, value: number) => {
    return supabase.from("grades").insert({
      post_id: postId,
      user_id: user!.id,
      value,
    });
  };

  const updateGradeDirect = async (postId: string, value: number) => {
    return supabase
      .from("grades")
      .update({ value })
      .eq("post_id", postId)
      .eq("user_id", user!.id);
  };

  const saveGradeDirect = async (
    postId: string,
    value: number,
    hadExistingGrade: boolean
  ) => {
    if (hadExistingGrade) {
      return updateGradeDirect(postId, value);
    }

    const insertResult = await insertGradeDirect(postId, value);
    if (!insertResult.error) {
      return insertResult;
    }

    const message = (insertResult.error.message ?? "").toLowerCase();
    if (message.includes("duplicate key")) {
      return updateGradeDirect(postId, value);
    }

    return insertResult;
  };

  const submitGrade = async (postId: string, value: number) => {
    if (!Number.isInteger(value) || value < 1 || value > 10) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Pick a whole number from 1 to 10.",
      }));
      return false;
    }
    if (!user) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Sign in required.",
      }));
      return false;
    }
    if (gradeStatsByPost[postId]?.userGrade === value) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "That rating is already saved.",
      }));
      return true;
    }

    const now = Date.now();
    const cooldownUntil = gradeCooldownUntilRef.current[postId] ?? 0;
    if (now < cooldownUntil) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Please wait before saving again.",
      }));
      return false;
    }

    const hadExistingGrade = gradeStatsByPost[postId]?.userGrade != null;

    gradeCooldownUntilRef.current[postId] = now + 1500;
    setGradeSubmittingPostId(postId);
    setGradeMessageByPost((current) => ({
      ...current,
      [postId]: null,
    }));

    const rpcResult = await supabase.rpc("set_grade", {
      grade_value: value,
      post_id: postId,
    });
    let error = rpcResult.error;

    if (error) {
      const directResult = await saveGradeDirect(postId, value, hadExistingGrade);
      error = directResult.error;
    }

    setGradeSubmittingPostId(null);

    if (error) {
      const message = (error.message ?? "").toLowerCase();
      const debugSuffix =
        __DEV__ && error.message
          ? ` (${error.message})`
          : "";
      if (__DEV__) {
        console.error("Failed to save rating", {
          code: "code" in error ? error.code : undefined,
          details: "details" in error ? error.details : undefined,
          hint: "hint" in error ? error.hint : undefined,
          message: error.message,
        });
      }
      if (message.includes("auth_required")) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "Sign in required.",
        }));
        return false;
      }
      if (message.includes("invalid_grade_value")) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "Pick a whole number from 1 to 10.",
        }));
        return false;
      }
      if (
        message.includes("invalid input syntax") ||
        message.includes("violates check constraint") ||
        message.includes("null value")
      ) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "Pick a whole number from 1 to 10.",
        }));
        return false;
      }
      if (
        message.includes("post_not_found") ||
        message.includes("post_not_published")
      ) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "This post is not available for rating.",
        }));
        return false;
      }
      if (
        message.includes("row-level security") ||
        message.includes("permission denied") ||
        message.includes("set_grade") ||
        message.includes("schema cache")
      ) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "Rating updates need the latest database migration.",
        }));
        return false;
      }
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: __DEV__
          ? `Could not save rating.${debugSuffix}`
          : "Could not save rating. Check connection and try again.",
      }));
      return false;
    }

    setGradeMessageByPost((current) => ({
      ...current,
      [postId]: hadExistingGrade ? "Rating updated." : "Rating saved.",
    }));
    await refreshGradeStats([postId]);
    return true;
  };

  const openRevealSheet = () => {
    setSheetMessage(null);
    setSheetVisible(true);

    if (user?.id && activePost?.id) {
      void logTagRevealBestEffort({
        postId: activePost.id,
        userId: user.id,
      }).then((result) => {
        if (__DEV__ && result.error) {
          console.error("Failed to log tag reveal", result.error);
        }
      });
    }
  };

  const openGradeSheet = (postId: string) => {
    const stats = gradeStatsByPost[postId];
    setGradeSheetPostId(postId);
    setGradeDraftValue(
      Math.max(1, Math.min(10, stats?.userGrade ?? Math.round(stats?.avg ?? 5)))
    );
    setGradeMessageByPost((current) => ({
      ...current,
      [postId]: null,
    }));
    setGradeSheetVisible(true);
  };

  const openCommentsSheet = (postId: string) => {
    setCommentsSheetPostId(postId);
    setCommentsSheetVisible(true);
    setCommentsForSheet([]);
    setCommentsComposerText("");
    setCommentsComposerMessage(null);
    void loadCommentsForPost(postId, "initial");
  };

  const closeCommentsSheet = () => {
    Keyboard.dismiss();
    setCommentsSheetVisible(false);
    setCommentsComposerMessage(null);
  };

  const handleSubmitComment = async () => {
    if (!commentsSheetPost || !user?.id) {
      setCommentsComposerMessage("Sign in required.");
      return;
    }

    const normalizedComment = commentsComposerText.trim().slice(0, COMMENT_MAX_LENGTH);
    if (!normalizedComment) {
      setCommentsComposerMessage("Write a comment first.");
      return;
    }

    const now = Date.now();
    const cooldownUntil = commentCooldownUntilRef.current[commentsSheetPost.id] ?? 0;
    if (now < cooldownUntil) {
      setCommentsComposerMessage("Please wait before posting again.");
      return;
    }

    commentCooldownUntilRef.current[commentsSheetPost.id] = now + 2000;
    setCommentsSubmitting(true);
    setCommentsComposerMessage(null);

    const optimisticId = `optimistic-${now}`;
    const optimisticComment: SocialComment = {
      created_at: new Date(now).toISOString(),
      id: optimisticId,
      post_id: commentsSheetPost.id,
      text: normalizedComment,
      user: {
        avatar_url: profile?.avatar_url ?? null,
        id: user.id,
        username:
          profile?.username ??
          user.email?.split("@")[0] ??
          user.id.replace(/-/g, "").slice(0, 8),
      },
      user_id: user.id,
    };

    setCommentsForSheet((current) =>
      sortCommentsOldestFirst([...current, optimisticComment])
    );
    setCommentsComposerText("");

    const result = await addCommentToPost(commentsSheetPost.id, user.id, normalizedComment);
    if (result.error) {
      setCommentsForSheet((current) =>
        current.filter((comment) => comment.id !== optimisticId)
      );
      setCommentsComposerText(normalizedComment);
      setCommentsComposerMessage(result.error);
      if (__DEV__) {
        console.error("Failed to submit comment", result.error);
      }
      setCommentsSubmitting(false);
      return;
    }

    await loadCommentsForPost(commentsSheetPost.id, "silent");
    setCommentsSubmitting(false);
    setCommentsComposerMessage("Comment posted.");
  };

  const handleGradeComplete = async (nextValue: number) => {
    if (!gradeSheetPost) {
      return;
    }

    setGradeDraftValue(nextValue);

    if (gradeSheetStats?.userGrade === nextValue) {
      setGradeSheetVisible(false);
      return;
    }

    const success = await submitGrade(gradeSheetPost.id, nextValue);
    if (success) {
      setGradeSheetVisible(false);
    }
  };

  const handleSubmitReport = async ({
    details,
    reason,
  }: {
    details: string;
    reason: string;
  }) => {
    if (!user?.id || !reportDraft) {
      setReportMessage("Sign in required.");
      return;
    }

    setReportSubmitting(true);
    setReportMessage(null);

    const result = await submitReport({
      details:
        reportDraft.targetType === "link" && reportDraft.initialDetails
          ? buildLinkReportDetails(reportDraft.initialDetails, details)
          : details,
      reason,
      reporterId: user.id,
      targetId: reportDraft.targetId,
      targetType: reportDraft.targetType,
    });

    setReportSubmitting(false);

    if (!result.success) {
      if (__DEV__) {
        console.error("Failed to submit report", result.error);
      }
      setReportMessage(
        "Could not submit report. Check connection and try again."
      );
      return;
    }

    setReportDraft(null);
    setFeedMessage("Report submitted.");
  };

  const openTagLink = async (tag: FeedTag) => {
    const validation = validateClothingTagUrl(tag.url, {
      requireUrl: false,
    });
    if (!validation.present) {
      setSheetMessage("This tag does not have an outbound link.");
      return;
    }
    if (!validation.valid) {
      setSheetMessage("Blocked unsafe link.");
      return;
    }

    const normalizedUrl = validation.normalized;
    const postId = activePost?.id;

    if (user?.id && postId && shouldLogOutboundClick(tag.id)) {
      void logOutboundClickBestEffort({
        postId,
        tagId: tag.id,
        url: normalizedUrl,
        userId: user.id,
      }).then((result) => {
        if (__DEV__ && result.error) {
          console.error("Failed to log outbound click", result.error);
        }
      });
    }

    try {
      await WebBrowser.openBrowserAsync(normalizedUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open link.";
      setSheetMessage(message);
    }
  };

  const listFooter = useMemo(() => {
    if (isLoading) {
      return (
        <View style={[styles.footer, { height: cardHeight }]}>
          <Text style={styles.footerText}>Loading…</Text>
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={[styles.footer, { height: cardHeight }]}>
          <Text style={styles.footerText}>No more posts</Text>
        </View>
      );
    }

    return null;
  }, [cardHeight, hasMore, isLoading]);

  return (
    <View style={styles.screen}>
      {feedMessage ? <Text style={styles.feedMessage}>{feedMessage}</Text> : null}

      {isLoading && posts.length === 0 ? (
        <View style={styles.fullscreenCenter}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.centerText}>Loading feed…</Text>
        </View>
      ) : null}

      {!isLoading && posts.length === 0 ? (
        <View style={styles.fullscreenCenter}>
          <Text style={styles.centerText}>No published posts yet.</Text>
          <Link href="/(app)/upload" style={styles.overlayLink}>
            Upload a post
          </Link>
        </View>
      ) : null}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => {
          const stats = gradeStatsByPost[item.id];
          return (
          <FeedVideoCard
            post={item}
            height={cardHeight}
            active={index === activeIndex && isFeedFocused && !commentsSheetVisible}
            shouldMountVideo={Math.abs(index - activeIndex) <= 1}
            captionExpanded={expandedCaptionPostId === item.id}
            commentCount={commentCountsByPost[item.id] ?? 0}
            onToggleCaption={() => {
              setExpandedCaptionPostId((current) =>
                current === item.id ? null : item.id
              );
            }}
            onOpenComments={() => {
              openCommentsSheet(item.id);
            }}
            onOpenGradeSheet={() => {
              openGradeSheet(item.id);
            }}
            onOpenProfile={() => {
              router.push(`/(app)/profile/${item.creator_id}`);
            }}
            onReportPost={() => {
              openReportComposer({
                subtitle: "Report this video post",
                targetId: item.id,
                targetType: "post",
                title: "Report post",
              });
            }}
            onReportProfile={() => {
              openReportComposer({
                subtitle: `Report @${item.creator_username}`,
                targetId: item.creator_id,
                targetType: "profile",
                title: "Report profile",
              });
            }}
            onRevealItems={openRevealSheet}
            topInset={insets.top}
            avgGradeText={stats?.avg != null ? stats.avg.toFixed(1) : "—"}
            gradeCount={stats?.count ?? 0}
            userGrade={stats?.userGrade ?? null}
          />
          );
        }}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        onEndReached={() => {
          if (!hasMore || isLoading) {
            return;
          }
          void loadPosts(offset, false);
        }}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        removeClippedSubviews
        ListFooterComponent={listFooter}
        scrollEnabled={posts.length > 0}
      />

      <CommentsSheet
        comments={commentsForSheet}
        composerMessage={commentsComposerMessage}
        composerText={commentsComposerText}
        isLoading={commentsLoading}
        isRefreshing={commentsRefreshing}
        isSubmitting={commentsSubmitting}
        onChangeComposerText={setCommentsComposerText}
        onClose={closeCommentsSheet}
        onRefresh={() => {
          if (!commentsSheetPostId) {
            return;
          }
          void loadCommentsForPost(commentsSheetPostId, "refresh");
        }}
        onSubmit={() => {
          void handleSubmitComment();
        }}
        post={commentsSheetPost}
        visible={commentsSheetVisible}
      />

      <ReportComposer
        visible={reportDraft != null}
        title={reportDraft?.title ?? "Report"}
        subtitle={reportDraft?.subtitle ?? "Report this content"}
        initialDetails=""
        isSubmitting={reportSubmitting}
        message={reportMessage}
        onClose={() => {
          if (reportSubmitting) {
            return;
          }
          setReportDraft(null);
          setReportMessage(null);
        }}
        onSubmit={handleSubmitReport}
      />

      <Modal
        visible={gradeSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setGradeSheetVisible(false)}
      >
        <Pressable
          style={styles.gradeBackdrop}
          onPress={() => setGradeSheetVisible(false)}
        >
          <Pressable
            style={[
              styles.gradePanel,
              gradeSheetPost && gradeSubmittingPostId === gradeSheetPost.id
                ? styles.gradePanelBusy
                : undefined,
            ]}
            onPress={() => {}}
          >
            <Text style={styles.gradeValue}>{gradeDraftValue}</Text>
            <GradeSlider
              disabled={!gradeSheetPost || gradeSubmittingPostId === gradeSheetPost.id}
              onChange={setGradeDraftValue}
              onSlidingComplete={(nextValue) => {
                void handleGradeComplete(nextValue);
              }}
              value={gradeDraftValue}
            />

            {gradeSheetPost && gradeMessageByPost[gradeSheetPost.id] ? (
              <Text
                style={styles.gradeInlineMessage}
              >
                {gradeMessageByPost[gradeSheetPost.id]}
              </Text>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={sheetVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setSheetVisible(false)}
        >
          <Pressable style={styles.sheetPanel} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Reveal items</Text>
            <Text style={styles.sheetSubTitle}>
              Post: {activePost?.id ?? "No post selected"}
            </Text>

            {sheetMessage ? <Text style={styles.sheetMessage}>{sheetMessage}</Text> : null}

            {!activePost || activePost.tags.length === 0 ? (
              <Text style={styles.sheetEmpty}>No items tagged for this post.</Text>
            ) : (
              activePost.tags.map((tag) => {
                const link = validateClothingTagUrl(tag.url, {
                  requireUrl: false,
                });
                const hasLink = link.present;
                const disabled = !hasLink || !link.valid;

                return (
                  <View
                    key={tag.id}
                    style={[
                      styles.tagRow,
                      disabled ? styles.tagRowDisabled : undefined,
                    ]}
                  >
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <Text style={styles.tagMeta}>Brand: {tag.brand || "-"}</Text>
                    <Text style={styles.tagMeta}>Category: {tag.category || "-"}</Text>
                    <Text style={styles.tagMeta}>
                      {hasLink
                        ? `URL: ${tag.url}`
                        : "No outbound link attached"}
                    </Text>
                    <View style={styles.tagActionRow}>
                      <Pressable
                        disabled={disabled}
                        onPress={() => {
                          if (!hasLink) {
                            setSheetMessage("This tag does not have an outbound link.");
                            return;
                          }
                          if (!link.valid) {
                            setSheetMessage("Blocked unsafe link.");
                            return;
                          }
                          void openTagLink(tag);
                        }}
                        style={[
                          styles.tagOpenButton,
                          disabled ? styles.tagOpenButtonDisabled : undefined,
                        ]}
                      >
                        <Text style={styles.tagOpenText}>
                          {!hasLink
                            ? "No link"
                            : !link.valid
                              ? "Unsafe link blocked"
                              : "Open link"}
                        </Text>
                      </Pressable>
                      {hasLink ? (
                        <Pressable
                          onPress={() => {
                            openReportComposer({
                              initialDetails: tag.url ?? "",
                              subtitle: `Report tagged link on ${tag.name}`,
                              targetId: tag.id,
                              targetType: "link",
                              title: "Report link",
                            });
                          }}
                          style={styles.tagReportButton}
                        >
                          <Text style={styles.tagReportText}>Report link</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomOverlay: {
    bottom: 94,
    left: 8,
    position: "absolute",
    right: 82,
    zIndex: 4,
  },
  commentBody: {
    flex: 1,
    marginLeft: 12,
  },
  commentMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  commentRow: {
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 12,
  },
  commentText: {
    color: theme.color.ink,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  commentTime: {
    color: theme.color.inkSoft,
    fontSize: 12,
  },
  commentUsername: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  commentsBackdrop: {
    backgroundColor: "rgba(17,12,10,0.26)",
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsCharacterCount: {
    color: theme.color.inkSoft,
    fontSize: 12,
  },
  commentsCloseButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  commentsCloseText: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
  },
  commentsComposer: {
    backgroundColor: "rgba(255,249,243,0.98)",
    borderTopColor: "rgba(216,206,194,0.72)",
    borderTopWidth: 1,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentsComposerFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  commentsComposerMessage: {
    color: theme.color.accentBright,
    fontSize: 12,
    marginTop: 10,
  },
  commentsEmptyText: {
    color: theme.color.inkSoft,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  commentsEmptyTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  commentsEmptyWrap: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  commentsHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(140,120,110,0.28)",
    borderRadius: 999,
    height: 5,
    marginBottom: 14,
    width: 54,
  },
  commentsHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  commentsInput: {
    color: theme.color.ink,
    fontSize: 15,
    lineHeight: 21,
    maxHeight: 86,
    minHeight: 40,
  },
  commentsListContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  commentsModalRoot: {
    flex: 1,
  },
  commentsPanel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "72%",
    minHeight: "58%",
    overflow: "hidden",
    shadowColor: "#6f5b4b",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  commentsPreviewCaption: {
    color: theme.color.white,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  commentsPreviewCard: {
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 22,
    borderWidth: 1,
    height: 164,
    overflow: "hidden",
    width: 124,
  },
  commentsPreviewMeta: {
    bottom: 10,
    left: 10,
    position: "absolute",
    right: 10,
  },
  commentsPreviewTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,12,10,0.14)",
  },
  commentsPreviewUsername: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  commentsPreviewVideo: {
    height: "100%",
    width: "100%",
  },
  commentsPreviewWrap: {
    alignItems: "center",
    marginBottom: -18,
    zIndex: 2,
  },
  commentsSendButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    minWidth: 86,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  commentsSendButtonDisabled: {
    opacity: 0.6,
  },
  commentsSendText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
  },
  commentsStateText: {
    color: theme.color.inkSoft,
    marginTop: 10,
    textAlign: "center",
  },
  commentsStateWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 220,
  },
  commentsTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
  },
  bottomUsername: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  caption: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 11,
    lineHeight: 15,
  },
  captionCard: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(192, 170, 144, 0.54)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 13,
    borderWidth: 1,
    maxWidth: 194,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardWrap: {
    backgroundColor: "#d7c7b4",
    overflow: "hidden",
    width: "100%",
  },
  centerText: {
    color: theme.color.ink,
    marginTop: 10,
    textAlign: "center",
  },
  expandCopy: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },
  creatorAvatar: {
    alignItems: "center",
    backgroundColor: "#cfb896",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    borderWidth: 2,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  creatorAvatarText: {
    color: theme.color.white,
    fontSize: 20,
    fontWeight: "800",
  },
  creatorButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,109,104,0.92)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  creatorButtonText: {
    color: theme.color.white,
    fontSize: 10,
    fontWeight: "700",
  },
  creatorCard: {
    alignItems: "center",
    backgroundColor: "rgba(214, 190, 164, 0.66)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 11,
    paddingVertical: 8,
    shadowColor: "#6f5b4b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    width: 208,
  },
  creatorCardWrap: {
    alignItems: "center",
    left: 8,
    position: "absolute",
    right: 8,
    zIndex: 4,
  },
  creatorMeta: {
    alignItems: "flex-start",
    flexShrink: 1,
  },
  creatorMainTap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  creatorName: {
    color: theme.color.white,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  feedMessage: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.accentSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    color: theme.color.danger,
    left: 12,
    padding: 12,
    position: "absolute",
    right: 12,
    top: 18,
    zIndex: 20,
  },
  gradeBackdrop: {
    backgroundColor: "rgba(15,10,8,0.10)",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 38,
    paddingHorizontal: 18,
  },
  gradeInlineMessage: {
    color: theme.color.accentBright,
    fontSize: 11,
    marginTop: 12,
    textAlign: "center",
  },
  gradePanel: {
    backgroundColor: "rgba(255, 250, 246, 0.98)",
    borderColor: "rgba(216, 206, 194, 0.84)",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#6e564b",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  gradePanelBusy: {
    opacity: 0.88,
  },
  gradeValue: {
    color: theme.color.accentBright,
    fontFamily: "serif",
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 40,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    backgroundColor: theme.color.shell,
    justifyContent: "center",
    width: "100%",
  },
  footerText: {
    color: theme.color.inkSoft,
    fontSize: 16,
  },
  fullscreenCenter: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    position: "absolute",
    width: "100%",
    zIndex: 10,
  },
  overlayLink: {
    backgroundColor: theme.color.white,
    borderRadius: theme.radius.pill,
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  placeholderText: {
    color: theme.color.shell,
    fontSize: 16,
  },
  scoreCard: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.58)",
    borderColor: "rgba(255,255,255,0.20)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 8,
    borderWidth: 1,
    minHeight: 104,
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  scoreCardHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 8,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  scoreCardSub: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 16,
    marginTop: 1,
  },
  scoreCardValue: {
    color: theme.color.white,
    fontFamily: "serif",
    fontSize: 38,
    fontWeight: "500",
    lineHeight: 40,
  },
  screen: {
    backgroundColor: "#d8c8b8",
    flex: 1,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetEmpty: {
    color: theme.color.inkSoft,
    marginTop: 12,
  },
  sheetMessage: {
    color: theme.color.accentBright,
    fontSize: 13,
    marginTop: 14,
  },
  sheetPanel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "72%",
    padding: 18,
  },
  sheetScoreText: {
    color: theme.color.inkSoft,
    fontSize: 15,
    marginTop: 8,
  },
  sheetSubTitle: {
    color: theme.color.muted,
    fontSize: 13,
    marginTop: 4,
  },
  sheetTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
  },
  sideRail: {
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: -8,
    top: "33%",
    zIndex: 4,
  },
  sideIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 58,
    paddingHorizontal: 6,
  },
  sideIconButtonText: {
    color: theme.color.white,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  sideIconButtonSubText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
  },
  sidePill: {
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 8,
    borderWidth: 1,
    minWidth: 74,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  sidePillLabel: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  sidePillSubLabel: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
  },
  tagChipEmpty: {
    color: theme.color.inkSoft,
    fontSize: 13,
  },
  tagChipText: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "700",
  },
  tagMeta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  tagActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tagName: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  tagOpenButton: {
    backgroundColor: "rgba(234,47,35,0.10)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagOpenButtonDisabled: {
    opacity: 0.55,
  },
  tagOpenText: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  tagReportButton: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.accentSoft,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagReportText: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "700",
  },
  tagRow: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
    ...theme.shadow.card,
  },
  tagRowDisabled: {
    opacity: 0.55,
  },
  video: {
    height: "100%",
    width: "100%",
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  videoTint: {
    backgroundColor: "rgba(228, 211, 191, 0.05)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
