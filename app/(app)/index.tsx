import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
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
  logPostWatchBestEffort,
  logTagRevealBestEffort,
  shouldLogOutboundClick,
} from "../../src/features/analytics";
import { useAuth } from "../../src/features/auth";
import {
  formatCommentTime,
  getCaptionPreview,
  getTagLinkSummary,
  sortCommentsOldestFirst,
  type FeedPost,
  type FeedPostSourceRow,
  type FeedTag,
  type RankedFeedPostRow,
} from "../../src/features/feed";
import { deleteOwnPost } from "../../src/features/posts";
import {
  addCommentToPost,
  COMMENT_MAX_LENGTH,
  fetchCommentCountsForPosts,
  listCommentsForPost,
  type SocialComment,
} from "../../src/features/social";
import {
  buildOutboundLinkFallbackPreview,
  fetchOutboundLinkPreview,
  getOutboundLinkPolicy,
  type OutboundLinkPreview,
} from "../../src/features/links";
import {
  buildLinkReportDetails,
  ReportComposer,
  submitReport,
  type ReportTargetType,
} from "../../src/features/reports";
import { supabase } from "../../src/lib/supabaseClient";
import { subscribeToAppDockRetap } from "../../src/ui/appDockEvents";
import { GradeSlider, ProfileAvatar } from "../../src/ui";
import { getDetailedErrorMessage } from "../../src/utils/errors";
import { validateClothingTagUrl } from "../../src/utils";

const clothingTagIcon = require("../../assets/PNGGG.png PNGGGG.png");
const PAGE_SIZE = 8;
const CREATOR_FEED_INITIAL_PAGE_SIZE = 24;

type ReportDraft = {
  initialDetails?: string;
  subtitle: string;
  targetId: string;
  targetType: ReportTargetType;
  title: string;
};

type LinkPreviewState = {
  postId: string;
  preview: OutboundLinkPreview;
  tag: FeedTag;
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
  commentCount: number;
  gradeCount: number;
  height: number;
  isHeaderActionDisabled: boolean;
  headerActionLabel: string;
  onOpenComments: () => void;
  onOpenGradeSheet: () => void;
  onHeaderActionPress: () => void;
  onOpenProfile: () => void;
  onReportPost: () => void;
  onRevealItems: () => void;
  onSavePost: () => void;
  onToggleCaption: () => void;
  post: FeedPost;
  shouldMountVideo: boolean;
  topInset: number;
  userGrade: number | null;
};

function FeedVideoCard({
  active,
  avgGradeText,
  commentCount,
  gradeCount,
  height,
  isHeaderActionDisabled,
  headerActionLabel,
  onOpenComments,
  onOpenGradeSheet,
  onHeaderActionPress,
  onOpenProfile,
  onReportPost,
  onRevealItems,
  onSavePost,
  onToggleCaption,
  post,
  shouldMountVideo,
  topInset,
  userGrade,
}: FeedVideoCardProps) {
  const player = useVideoPlayer(
    shouldMountVideo && post.media_type === "video" ? post.video_url : null,
    (videoPlayer) => {
      videoPlayer.loop = true;
    }
  );
  const captionPreview = getCaptionPreview(post.caption);
  const captionText = captionPreview.text;
  const creatorLabel = post.creator_username.trim().toUpperCase();
  const taggedItemCopy = `Items · ${post.tags.length}`;

  useEffect(() => {
    if (!shouldMountVideo || post.media_type !== "video") {
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
        post.media_type === "image" ? (
          <Image source={{ uri: post.video_url }} style={styles.video} resizeMode="cover" />
        ) : (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
            pointerEvents="none"
          />
        )
      ) : (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <Text style={styles.placeholderText}>Loading…</Text>
        </View>
      )}

      <View style={styles.videoTint} />
      <View style={[styles.creatorCardWrap, { top: topInset + 4 }]}>
        <View style={styles.creatorCard}>
          <View style={styles.creatorMainTap}>
            <View style={styles.creatorAvatar}>
              <Pressable onPress={onOpenProfile}>
                <ProfileAvatar
                  avatarUrl={post.creator_avatar_url}
                  size={42}
                  username={post.creator_username}
                />
              </Pressable>
            </View>
            <View style={styles.creatorMeta}>
              <Pressable onPress={onOpenProfile}>
                <Text numberOfLines={1} style={styles.creatorName}>
                  {creatorLabel}
                </Text>
              </Pressable>
              <Pressable hitSlop={6} onPress={onToggleCaption}>
                <Text numberOfLines={1} style={styles.creatorCaption}>
                  {captionText}
                </Text>
              </Pressable>
            </View>
          </View>
          <Pressable
            disabled={isHeaderActionDisabled}
            onPress={onHeaderActionPress}
            style={[
              styles.creatorButton,
              isHeaderActionDisabled ? styles.creatorButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.creatorButtonText}>{headerActionLabel}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={onRevealItems} style={[styles.itemsPill, { top: topInset + 80 }]}>
        <Image source={clothingTagIcon} resizeMode="contain" style={styles.itemsPillIcon} />
        <Text style={styles.itemsPillLabel}>{taggedItemCopy}</Text>
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

      <View style={styles.feedActionBar}>
        <Pressable onPress={onSavePost} style={styles.feedActionButton}>
          <Text style={styles.feedActionButtonText}>Save</Text>
        </Pressable>
        <View style={styles.feedActionDivider} />
        <Pressable onPress={onOpenComments} style={styles.feedActionButton}>
          <Text style={styles.feedActionButtonText}>Comment</Text>
          <Text style={styles.feedActionButtonMeta}>
            {commentCount > 0 ? String(commentCount) : "Add"}
          </Text>
        </Pressable>
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
  const previewPlayer = useVideoPlayer(
    visible && post?.media_type === "video" ? post.video_url : null,
    (player) => {
      player.loop = true;
    }
  );
  const remainingCharacters = COMMENT_MAX_LENGTH - composerText.length;

  useEffect(() => {
    if (!visible || !post || post.media_type !== "video") {
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
            onClose();
          }}
        >
          <Pressable
            style={styles.commentsPreviewWrap}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
          >
            {post ? (
              <View style={styles.commentsPreviewCard}>
                {post.media_type === "image" ? (
                  <Image
                    source={{ uri: post.video_url }}
                    style={styles.commentsPreviewVideo}
                    resizeMode="cover"
                  />
                ) : (
                  <VideoView
                    player={previewPlayer}
                    style={styles.commentsPreviewVideo}
                    contentFit="cover"
                    nativeControls={false}
                  />
                )}
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
                <Text style={styles.commentsCloseText}>Close</Text>
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
  const { creatorId: requestedCreatorIdParam, postId: requestedPostIdParam } =
    useLocalSearchParams<{ creatorId?: string; postId?: string }>();
  const { profile, user } = useAuth();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardHeight = Math.max(height, 560);
  const requestedCreatorId =
    typeof requestedCreatorIdParam === "string" ? requestedCreatorIdParam : null;
  const requestedPostId =
    typeof requestedPostIdParam === "string" ? requestedPostIdParam : null;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [hasResolvedInitialLoad, setHasResolvedInitialLoad] = useState(false);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [isFeedFocused, setIsFeedFocused] = useState(true);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const [linkPreviewMessage, setLinkPreviewMessage] = useState<string | null>(null);
  const [linkPreviewState, setLinkPreviewState] = useState<LinkPreviewState | null>(
    null
  );
  const [linkPreviewVisible, setLinkPreviewVisible] = useState(false);
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
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
  const flatListRef = useRef<FlatList<FeedPost> | null>(null);
  const linkPreviewRequestIdRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const postsRef = useRef<FeedPost[]>([]);
  const requestedPostFetchRef = useRef<string | null>(null);
  const requestedPostFocusedRef = useRef<string | null>(null);
  const activeWatchRef = useRef<{ postId: string; startedAt: number } | null>(null);

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
  const showInitialLoader = posts.length === 0 && !hasResolvedInitialLoad;
  const showEmptyFeedState =
    !isLoading && hasResolvedInitialLoad && posts.length === 0;
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

  const handleDeletePost = useCallback(
    (post: FeedPost) => {
      Alert.alert(
        "Delete post?",
        "This removes the post from your profile and feed. Any tags, grades, comments, and reports attached to it will be removed too.",
        [
          { style: "cancel", text: "Cancel" },
          {
            style: "destructive",
            text: "Delete",
            onPress: () => {
              void confirmDeletePost(post);
            },
          },
        ]
      );
    },
    []
  );

  const handleSavePost = useCallback(() => {
    Alert.alert(
      "Save coming soon",
      "We haven't wired saved posts yet, but this control is now in place."
    );
  }, []);

  const handleOpenCaption = useCallback((post: FeedPost) => {
    const caption = post.caption.trim();
    if (!caption) {
      return;
    }

    Alert.alert(`@${post.creator_username}`, caption);
  }, []);

  const confirmDeletePost = useCallback(
    async (post: FeedPost) => {
      if (deletingPostId) {
        return;
      }

      setDeletingPostId(post.id);
      setFeedMessage(null);

      const result = await deleteOwnPost(post.id);
      setDeletingPostId(null);

      if (result.error) {
        setFeedMessage(result.error);
        return;
      }

      if (activeWatchRef.current?.postId === post.id) {
        activeWatchRef.current = null;
      }

      const deletedIndex = postsRef.current.findIndex((candidate) => candidate.id === post.id);

      setPosts((current) => current.filter((candidate) => candidate.id !== post.id));
      setGradeStatsByPost((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      setCommentCountsByPost((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      setGradeMessageByPost((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });

      if (gradeSheetPostId === post.id) {
        setGradeSheetVisible(false);
        setGradeSheetPostId(null);
      }
      if (commentsSheetPostId === post.id) {
        setCommentsSheetVisible(false);
        setCommentsSheetPostId(null);
        setCommentsForSheet([]);
      }
      if (requestedPostId === post.id) {
        router.replace("/(app)");
      }

      const remainingCount = Math.max(0, postsRef.current.length - 1);
      if (remainingCount === 0) {
        setActiveIndex(0);
      } else if (deletedIndex >= 0 && activeIndex >= remainingCount) {
        setActiveIndex(remainingCount - 1);
      }

      setFeedMessage(result.storageWarning ?? "Post deleted.");
    },
    [
      activeIndex,
      commentsSheetPostId,
      deletingPostId,
      gradeSheetPostId,
      requestedPostId,
      router,
    ]
  );

  const focusFeedPostAtIndex = useCallback(
    (index: number) => {
      if (index < 0) {
        return;
      }
      setActiveIndex(index);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          animated: false,
          index,
        });
      });
    },
    []
  );

  const hydrateFeedPosts = useCallback(
    async (rawPosts: FeedPostSourceRow[], batchSeed: string) => {
      const postIds = rawPosts.map((post) => post.id);

      let tagsByPostId = new Map<string, FeedTag[]>();
      if (postIds.length > 0) {
        const { data: tagsData, error: tagsError } = await supabase
          .from("clothing_tags")
          .select("id, post_id, name, brand, category, url")
          .in("post_id", postIds);

        if (tagsError) {
          throw new Error(`Failed to load feed tags: ${tagsError.message}`);
        }

        tagsByPostId = (tagsData ?? []).reduce((map, tagRow) => {
          const current = map.get(String(tagRow.post_id)) ?? [];
          current.push({
            brand: tagRow.brand,
            category: tagRow.category,
            id: tagRow.id,
            name: tagRow.name,
            url: tagRow.url,
          });
          map.set(String(tagRow.post_id), current);
          return map;
        }, new Map<string, FeedTag[]>());
      }

      const creatorIds = Array.from(new Set(rawPosts.map((post) => String(post.creator_id))));

      let profileMap = new Map<
        string,
        {
          avatar_url: string | null;
          username: string;
        }
      >();
      if (creatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", creatorIds);

        if (profilesError) {
          throw new Error(`Failed to load feed profiles: ${profilesError.message}`);
        }

        profileMap = new Map(
          (profilesData ?? []).map((creatorProfile) => [
            creatorProfile.id,
            {
              avatar_url: creatorProfile.avatar_url ?? null,
              username: creatorProfile.username,
            },
          ])
        );
      }

      return rawPosts.map((post, index) => ({
        caption: post.caption ?? "",
        creator_avatar_url:
          String(post.creator_id) === user?.id
            ? profile?.avatar_url ?? profileMap.get(String(post.creator_id))?.avatar_url ?? null
            : profileMap.get(String(post.creator_id))?.avatar_url ?? null,
        created_at: post.created_at,
        creator_id: String(post.creator_id),
        creator_username:
          (String(post.creator_id) === user?.id
            ? profile?.username
            : profileMap.get(String(post.creator_id))?.username) ??
          String(post.creator_id).slice(0, 8),
        id: post.id,
        instanceKey: `${post.id}:${batchSeed}:${index}`,
        media_type: post.media_type ?? "video",
        tags: tagsByPostId.get(post.id) ?? [],
        video_url: post.video_url,
      })) satisfies FeedPost[];
    },
    [profile?.avatar_url, profile?.username, user?.id]
  );

  const fetchFeedPostById = useCallback(
    async (postId: string) => {
      const { data, error } = await supabase
        .from("video_posts")
        .select("id, caption, video_url, media_type, created_at, creator_id")
        .eq("id", postId)
        .eq("status", "published")
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load selected post: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      const batchSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const [mappedPost] = await hydrateFeedPosts(
        [data as FeedPostSourceRow],
        batchSeed
      );

      return mappedPost ?? null;
    },
    [hydrateFeedPosts]
  );

  const closeLinkPreview = useCallback((options?: { reopenSheet?: boolean }) => {
    linkPreviewRequestIdRef.current += 1;
    setLinkPreviewLoading(false);
    setLinkPreviewMessage(null);
    setLinkPreviewState(null);
    setLinkPreviewVisible(false);
    if (options?.reopenSheet) {
      setSheetVisible(true);
    }
  }, []);

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

  const loadPosts = async (
    reset: boolean,
    reason: "initial" | "paginate" | "refresh" = "initial"
  ) => {
    if (loadInFlightRef.current || !user?.id) {
      return;
    }

    loadInFlightRef.current = true;
    if (reason === "refresh") {
      setIsFeedRefreshing(true);
    }
    setIsLoading(true);
    setFeedMessage(null);
    try {
      const fetchRankedPosts = async (excludePostIds: string[]) => {
        const { data, error } = await supabase.rpc("rank_feed_posts", {
          exclude_post_ids: excludePostIds,
          page_limit: PAGE_SIZE,
          viewer_id: user.id,
        });

        return {
          error,
          rows: (data ?? []) as RankedFeedPostRow[],
        };
      };

      const fetchCreatorPosts = async (offset: number, limit: number) => {
        const { data, error } = await supabase
          .from("video_posts")
          .select("id, caption, video_url, media_type, created_at, creator_id")
          .eq("creator_id", requestedCreatorId)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        return {
          error,
          rows: (data ?? []) as FeedPostSourceRow[],
        };
      };

      const excludePostIds = reset ? [] : posts.map((post) => post.id);
      const creatorFeedLimit = reset ? CREATOR_FEED_INITIAL_PAGE_SIZE : PAGE_SIZE;
      let recycleBatch = false;
      let postsError: { message: string } | null = null;
      let rawPosts: FeedPostSourceRow[] = [];

      if (requestedCreatorId) {
        const creatorResult = await fetchCreatorPosts(reset ? 0 : posts.length, creatorFeedLimit);
        postsError = creatorResult.error;
        rawPosts = creatorResult.rows;
      } else {
        const rankedResult = await fetchRankedPosts(excludePostIds);
        postsError = rankedResult.error;
        rawPosts = rankedResult.rows;
      }

      if (postsError) {
        setFeedMessage(`Failed to load feed: ${postsError.message}`);
        return;
      }

      if (!requestedCreatorId && !reset && rawPosts.length === 0 && posts.length > 0) {
        recycleBatch = true;
        const recycleExcludeIds = activePost?.id ? [activePost.id] : [];
        const recycleResult = await fetchRankedPosts(recycleExcludeIds);
        postsError = recycleResult.error;
        rawPosts = recycleResult.rows;

        if (postsError) {
          setFeedMessage(`Failed to load feed: ${postsError.message}`);
          return;
        }
      }

      const batchSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let mappedPosts = await hydrateFeedPosts(rawPosts, batchSeed);

      if (reset && requestedPostId && !mappedPosts.some((post) => post.id === requestedPostId)) {
        try {
          const focusedPost = await fetchFeedPostById(requestedPostId);
          if (focusedPost) {
            mappedPosts = [focusedPost, ...mappedPosts];
          }
        } catch (error) {
          if (__DEV__) {
            console.error("Failed to preload selected post", error);
          }
        }
      }

      setPosts((current) => {
        if (reset) {
          return mappedPosts;
        }
        if (recycleBatch) {
          return [...current, ...mappedPosts];
        }
        const known = new Set(current.map((post) => post.id));
        const deduped = mappedPosts.filter((post) => !known.has(post.id));
        return [...current, ...deduped];
      });

      setHasMore(
        requestedCreatorId ? rawPosts.length === creatorFeedLimit : mappedPosts.length > 0
      );

      const knownIds = reset ? [] : posts.map((post) => post.id);
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
      setFeedMessage(getDetailedErrorMessage(error, "Failed to load feed"));
      if (__DEV__) {
        console.error("Failed to load feed", error);
      }
    } finally {
      if (reset) {
        setHasResolvedInitialLoad(true);
      }
      loadInFlightRef.current = false;
      setIsFeedRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useFocusEffect(
    useCallback(() => {
      setIsFeedFocused(true);

      if (!user?.id) {
        return () => {
          setIsFeedFocused(false);
        };
      }

      if (!hasResolvedInitialLoad) {
        void loadPosts(true, "initial");
      } else if (postsRef.current.length > 0) {
        void refreshCommentCounts(postsRef.current.map((post) => post.id));
      }

      return () => {
        setIsFeedFocused(false);
      };
    }, [hasResolvedInitialLoad, user?.id])
  );

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void loadPosts(true, "initial");
  }, [requestedCreatorId, requestedPostId, user?.id]);

  useEffect(() => {
    return subscribeToAppDockRetap("feed", () => {
      if (
        commentsSheetVisible ||
        gradeSheetVisible ||
        sheetVisible ||
        linkPreviewVisible ||
        reportDraft
      ) {
        return;
      }

      setFeedMessage(null);
      setActiveIndex(0);

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({
          animated: true,
          offset: 0,
        });
      });
    });
  }, [
    commentsSheetVisible,
    gradeSheetVisible,
    linkPreviewVisible,
    reportDraft,
    sheetVisible,
  ]);

  useEffect(() => {
    requestedPostFetchRef.current = null;
    requestedPostFocusedRef.current = null;
  }, [requestedCreatorId, requestedPostId]);

  useEffect(() => {
    if (!requestedPostId || !user?.id) {
      return;
    }

    const existingIndex = posts.findIndex((post) => post.id === requestedPostId);
    if (existingIndex >= 0) {
      if (requestedPostFocusedRef.current !== requestedPostId) {
        requestedPostFocusedRef.current = requestedPostId;
        focusFeedPostAtIndex(existingIndex);
      }
      return;
    }

    if (isLoading || requestedPostFetchRef.current === requestedPostId) {
      return;
    }

    requestedPostFetchRef.current = requestedPostId;
    let cancelled = false;

    void (async () => {
      try {
        const focusedPost = await fetchFeedPostById(requestedPostId);
        if (cancelled) {
          return;
        }

        if (!focusedPost) {
          setFeedMessage("That post is no longer available.");
          return;
        }

        setPosts((current) =>
          current.some((post) => post.id === focusedPost.id)
            ? current
            : [focusedPost, ...current]
        );
        setHasMore(true);
        requestedPostFocusedRef.current = requestedPostId;
        focusFeedPostAtIndex(0);
        await refreshGradeStats([focusedPost.id]);
        await refreshCommentCounts([focusedPost.id]);
      } catch (error) {
        if (__DEV__) {
          console.error("Failed to open selected post in feed", error);
        }
        setFeedMessage(getDetailedErrorMessage(error, "Could not open that post"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    fetchFeedPostById,
    focusFeedPostAtIndex,
    isLoading,
    posts,
    requestedPostId,
    user?.id,
  ]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    setPosts((current) =>
      current.map((post) =>
        post.creator_id === user.id
          ? {
              ...post,
              creator_avatar_url: profile?.avatar_url ?? post.creator_avatar_url,
              creator_username: profile?.username ?? post.creator_username,
            }
          : post
      )
    );
  }, [profile?.avatar_url, profile?.username, user?.id]);

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

  useEffect(() => {
    const canTrackWatch =
      Boolean(user?.id) &&
      isFeedFocused &&
      !commentsSheetVisible &&
      !gradeSheetVisible &&
      !sheetVisible &&
      !linkPreviewVisible;
    const nextPostId = canTrackWatch ? activePost?.id ?? null : null;
    const now = Date.now();
    const currentWatch = activeWatchRef.current;

    if (currentWatch && currentWatch.postId !== nextPostId && user?.id) {
      const watchMs = now - currentWatch.startedAt;
      const completed = watchMs >= 15000;
      void logPostWatchBestEffort({
        completed,
        postId: currentWatch.postId,
        userId: user.id,
        watchMs,
      }).then((result) => {
        if (__DEV__ && result.error) {
          console.error("Failed to log post watch", result.error);
        }
      });
      activeWatchRef.current = null;
    }

    if (nextPostId && user?.id) {
      if (!currentWatch || currentWatch.postId !== nextPostId) {
        activeWatchRef.current = {
          postId: nextPostId,
          startedAt: now,
        };
      }
      return;
    }

    activeWatchRef.current = null;
  }, [
    activePost?.id,
    commentsSheetVisible,
    gradeSheetVisible,
    isFeedFocused,
    linkPreviewVisible,
    sheetVisible,
    user?.id,
  ]);

  useEffect(() => {
    return () => {
      const currentWatch = activeWatchRef.current;
      if (!currentWatch || !user?.id) {
        return;
      }

      const watchMs = Date.now() - currentWatch.startedAt;
      const completed = watchMs >= 15000;
      void logPostWatchBestEffort({
        completed,
        postId: currentWatch.postId,
        userId: user.id,
        watchMs,
      });
      activeWatchRef.current = null;
    };
  }, [user?.id]);

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
    closeLinkPreview();
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

    const policy = getOutboundLinkPolicy(validation.normalized);
    if (!policy.allowed) {
      setSheetMessage(policy.reason ?? "Blocked unsafe link.");
      return;
    }

    const postId = activePost?.id;
    if (!postId) {
      setSheetMessage("No post selected.");
      return;
    }

    const requestId = linkPreviewRequestIdRef.current + 1;
    linkPreviewRequestIdRef.current = requestId;
    setSheetMessage(null);
    setLinkPreviewLoading(true);
    setLinkPreviewMessage(null);
    setLinkPreviewState({
      postId,
      preview: buildOutboundLinkFallbackPreview(validation.normalized),
      tag,
    });
    setSheetVisible(false);
    setLinkPreviewVisible(true);

    const preview = await fetchOutboundLinkPreview(validation.normalized);
    if (linkPreviewRequestIdRef.current !== requestId) {
      return;
    }

    setLinkPreviewState({
      postId,
      preview,
      tag,
    });
    setLinkPreviewMessage(preview.blockedReason ?? preview.warning);
    setLinkPreviewLoading(false);
  };

  const openPreviewDestination = async () => {
    if (!linkPreviewState) {
      return;
    }

    const validation = validateClothingTagUrl(linkPreviewState.preview.finalUrl, {
      requireUrl: true,
    });
    if (!validation.valid) {
      setLinkPreviewMessage(validation.error ?? "Blocked unsafe link.");
      return;
    }

    const policy = getOutboundLinkPolicy(validation.normalized);
    if (!policy.allowed) {
      setLinkPreviewMessage(policy.reason ?? "Blocked unsafe link.");
      return;
    }

    if (user?.id && shouldLogOutboundClick(linkPreviewState.tag.id)) {
      void logOutboundClickBestEffort({
        postId: linkPreviewState.postId,
        tagId: linkPreviewState.tag.id,
        url: validation.normalized,
        userId: user.id,
      }).then((result) => {
        if (__DEV__ && result.error) {
          console.error("Failed to log outbound click", result.error);
        }
      });
    }

    try {
      Sentry.addBreadcrumb({
        category: "commerce",
        data: {
          postId: linkPreviewState.postId,
          tagId: linkPreviewState.tag.id,
          url: validation.normalized,
        },
        level: "info",
        message: "Outbound link opened",
        type: "user",
      });
      await WebBrowser.openBrowserAsync(validation.normalized);
      closeLinkPreview();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open link.";
      setLinkPreviewMessage(message);
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

      {showInitialLoader ? (
        <View style={styles.fullscreenCenter}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.centerText}>Loading feed…</Text>
        </View>
      ) : null}

      {showEmptyFeedState ? (
        <View style={styles.fullscreenCenter}>
          <Text style={styles.centerText}>No published posts yet.</Text>
          <Text style={styles.emptyFeedCopy}>
            Publish the first look to populate the feed and profile grid.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(app)/upload")}
            style={styles.overlayButton}
          >
            <Text style={styles.overlayButtonText}>Upload a post</Text>
          </Pressable>
        </View>
      ) : null}

      {!showEmptyFeedState ? (
        <FlatList
          ref={flatListRef}
          data={posts}
          getItemLayout={(_, index) => ({
            index,
            length: cardHeight,
            offset: cardHeight * index,
          })}
          keyExtractor={(item) => item.instanceKey}
          onScrollToIndexFailed={({ index }) => {
            requestAnimationFrame(() => {
              flatListRef.current?.scrollToIndex({
                animated: false,
                index,
              });
            });
          }}
          renderItem={({ item, index }) => {
            const stats = gradeStatsByPost[item.id];
            return (
              <FeedVideoCard
                post={item}
                height={cardHeight}
                active={index === activeIndex && isFeedFocused && !commentsSheetVisible}
                shouldMountVideo={Math.abs(index - activeIndex) <= 1}
                commentCount={commentCountsByPost[item.id] ?? 0}
                headerActionLabel={
                  item.creator_id === user?.id
                    ? deletingPostId === item.id
                      ? "Deleting..."
                      : "Delete"
                    : "Report"
                }
                isHeaderActionDisabled={deletingPostId === item.id}
                onToggleCaption={() => {
                  handleOpenCaption(item);
                }}
                onHeaderActionPress={() => {
                  if (item.creator_id === user?.id) {
                    handleDeletePost(item);
                    return;
                  }
                  openReportComposer({
                    subtitle: `Report @${item.creator_username}`,
                    targetId: item.creator_id,
                    targetType: "profile",
                    title: "Report profile",
                  });
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
                onRevealItems={openRevealSheet}
                onSavePost={handleSavePost}
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
          onEndReached={() => {
            if (!hasMore || isLoading) {
              return;
            }
            void loadPosts(false, "paginate");
          }}
          onEndReachedThreshold={0.5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          ListFooterComponent={listFooter}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void loadPosts(true, "refresh");
              }}
              progressViewOffset={Math.max(insets.top + 10, 24)}
              refreshing={isFeedRefreshing}
              tintColor={theme.color.accentBright}
            />
          }
          scrollEnabled={posts.length > 0}
        />
      ) : null}

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
        onRequestClose={() => {
          closeLinkPreview();
          setSheetVisible(false);
        }}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => {
            closeLinkPreview();
            setSheetVisible(false);
          }}
        >
          <Pressable style={styles.sheetPanel} onPress={() => {}}>
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Reveal items</Text>
                <Text style={styles.sheetSubTitle}>
                  {!activePost
                    ? "No post selected"
                    : activePost.tags.length === 1
                      ? "1 tagged item"
                      : `${activePost.tags.length} tagged items`}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  closeLinkPreview();
                  setSheetVisible(false);
                }}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseText}>Done</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {sheetMessage ? <Text style={styles.sheetMessage}>{sheetMessage}</Text> : null}

              {!activePost || activePost.tags.length === 0 ? (
                <Text style={styles.sheetEmpty}>No items tagged for this post.</Text>
              ) : (
                activePost.tags.map((tag) => {
                  const linkSummary = getTagLinkSummary(tag);

                  return (
                    <View
                      key={tag.id}
                      style={[
                        styles.tagRow,
                        !linkSummary.canPreview ? styles.tagRowDisabled : undefined,
                      ]}
                    >
                      <View style={styles.tagHeaderRow}>
                        <Text style={styles.tagName}>{tag.name}</Text>
                        <View
                          style={[
                            styles.tagLinkPill,
                            linkSummary.blocked ? styles.tagLinkPillBlocked : undefined,
                            !linkSummary.canPreview && !linkSummary.blocked
                              ? styles.tagLinkPillMuted
                              : undefined,
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagLinkPillText,
                              linkSummary.blocked ? styles.tagLinkPillTextBlocked : undefined,
                            ]}
                          >
                            {linkSummary.detail}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.tagMetaRow}>
                        {tag.brand ? (
                          <Text style={styles.tagMetaChip}>{tag.brand}</Text>
                        ) : null}
                        {tag.category ? (
                          <Text style={styles.tagMetaChip}>{tag.category}</Text>
                        ) : null}
                      </View>

                      <View style={styles.tagActionRow}>
                        <Pressable
                          onPress={() => {
                            if (!linkSummary.canPreview) {
                              setSheetMessage(linkSummary.reason);
                              return;
                            }
                            void openTagLink(tag);
                          }}
                          style={[
                            styles.tagOpenButton,
                            !linkSummary.canPreview ? styles.tagOpenButtonBlocked : undefined,
                          ]}
                        >
                          <Text style={styles.tagOpenText}>
                            {linkSummary.canPreview ? "Preview link" : linkSummary.detail}
                          </Text>
                        </Pressable>
                        {tag.url ? (
                          <Pressable
                            onPress={() => {
                              closeLinkPreview();
                              setSheetVisible(false);
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

                      {linkSummary.reason && linkSummary.canPreview ? null : linkSummary.reason ? (
                        <Text style={styles.tagStatusText}>{linkSummary.reason}</Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={linkPreviewVisible}
        animationType="fade"
        transparent
        onRequestClose={() => closeLinkPreview({ reopenSheet: true })}
      >
        <Pressable
          style={styles.linkPreviewBackdrop}
          onPress={() => closeLinkPreview({ reopenSheet: true })}
        >
          <Pressable style={styles.linkPreviewCard} onPress={() => {}}>
            <View style={styles.linkPreviewHandle} />
            <Text style={styles.linkPreviewEyebrow}>Link preview</Text>

            {linkPreviewState?.preview.imageUrl ? (
              <Image
                source={{ uri: linkPreviewState.preview.imageUrl }}
                style={styles.linkPreviewImage}
              />
            ) : (
              <View style={styles.linkPreviewImageFallback}>
                <Text style={styles.linkPreviewImageFallbackText}>
                  {linkPreviewState?.preview.siteLabel ?? "Site"}
                </Text>
              </View>
            )}

            <View style={styles.linkPreviewHeaderRow}>
              <View style={styles.linkPreviewHeaderText}>
                <Text numberOfLines={1} style={styles.linkPreviewTagName}>
                  {linkPreviewState?.tag.name ?? "Tagged item"}
                </Text>
                <Text numberOfLines={2} style={styles.linkPreviewTitle}>
                  {linkPreviewState?.preview.title ?? "Open site"}
                </Text>
              </View>
              {linkPreviewLoading ? (
                <ActivityIndicator color={theme.color.accentBright} size="small" />
              ) : null}
            </View>

            <Text numberOfLines={1} style={styles.linkPreviewDomain}>
              {linkPreviewState?.preview.hostname ?? ""}
            </Text>

            {linkPreviewState?.preview.price ? (
              <View style={styles.linkPreviewPricePill}>
                <Text style={styles.linkPreviewPriceText}>
                  {linkPreviewState.preview.price}
                </Text>
              </View>
            ) : null}

            <Text numberOfLines={3} style={styles.linkPreviewDescription}>
              {linkPreviewState?.preview.description ??
                "We’ll open this item in your browser. Metadata is fetched best-effort from the destination site."}
            </Text>

            {linkPreviewMessage ? (
              <Text style={styles.linkPreviewMessage}>{linkPreviewMessage}</Text>
            ) : null}

            <View style={styles.linkPreviewActionRow}>
              <Pressable
                onPress={() => closeLinkPreview({ reopenSheet: true })}
                style={styles.linkPreviewSecondaryButton}
              >
                <Text style={styles.linkPreviewSecondaryText}>Back</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(linkPreviewState?.preview.blockedReason)}
                onPress={() => {
                  void openPreviewDestination();
                }}
                style={[
                  styles.linkPreviewPrimaryButton,
                  linkPreviewState?.preview.blockedReason
                    ? styles.linkPreviewPrimaryButtonDisabled
                    : undefined,
                ]}
              >
                <Text style={styles.linkPreviewPrimaryText}>
                  View on {linkPreviewState?.preview.siteLabel ?? "site"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  emptyFeedCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 240,
    textAlign: "center",
  },
  creatorAvatar: {
    borderRadius: 999,
    height: 42,
    overflow: "hidden",
    width: 42,
  },
  creatorButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,109,104,0.92)",
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  creatorButtonDisabled: {
    opacity: 0.72,
  },
  creatorButtonText: {
    color: theme.color.white,
    fontSize: 11,
    fontWeight: "700",
  },
  creatorCard: {
    alignItems: "center",
    backgroundColor: "rgba(214, 190, 164, 0.66)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 68,
    justifyContent: "space-between",
    maxWidth: 368,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#6f5b4b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    width: "100%",
  },
  creatorCardWrap: {
    alignItems: "center",
    left: 14,
    position: "absolute",
    right: 14,
    zIndex: 4,
  },
  creatorMeta: {
    alignItems: "flex-start",
    flex: 1,
    gap: 4,
    flexShrink: 1,
  },
  creatorMainTap: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 11,
  },
  creatorCaption: {
    color: "rgba(255,255,255,0.94)",
    fontSize: 11.5,
    lineHeight: 14,
  },
  creatorName: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
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
  overlayButton: {
    backgroundColor: theme.color.white,
    borderRadius: theme.radius.pill,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  overlayButtonText: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  placeholderText: {
    color: theme.color.shell,
    fontSize: 16,
  },
  linkPreviewActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  linkPreviewBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20,12,8,0.48)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  linkPreviewCard: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: "rgba(221,208,194,0.92)",
    borderRadius: 26,
    borderWidth: 1,
    maxWidth: 460,
    padding: 18,
    width: "100%",
  },
  linkPreviewDescription: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  linkPreviewDomain: {
    color: theme.color.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  linkPreviewEyebrow: {
    color: theme.color.accentBright,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  linkPreviewHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(173,150,127,0.34)",
    borderRadius: theme.radius.pill,
    height: 4,
    marginBottom: 12,
    width: 42,
  },
  linkPreviewHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 14,
  },
  linkPreviewHeaderText: {
    flex: 1,
  },
  linkPreviewImage: {
    backgroundColor: "rgba(233,226,218,0.8)",
    borderRadius: 18,
    height: 168,
    marginTop: 10,
    width: "100%",
  },
  linkPreviewImageFallback: {
    alignItems: "center",
    backgroundColor: "rgba(215,198,178,0.72)",
    borderRadius: 18,
    height: 168,
    justifyContent: "center",
    marginTop: 10,
    width: "100%",
  },
  linkPreviewImageFallbackText: {
    color: theme.color.white,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  linkPreviewMessage: {
    color: theme.color.accentBright,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  linkPreviewPrimaryButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  linkPreviewPrimaryButtonDisabled: {
    backgroundColor: "rgba(234,47,35,0.30)",
  },
  linkPreviewPrimaryText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  linkPreviewPricePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234,47,35,0.10)",
    borderRadius: theme.radius.pill,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  linkPreviewPriceText: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "800",
  },
  linkPreviewSecondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(233,223,212,0.72)",
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16,
  },
  linkPreviewSecondaryText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  linkPreviewTagName: {
    color: theme.color.accentBright,
    fontSize: 12,
    fontWeight: "700",
  },
  linkPreviewTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
    marginTop: 4,
  },
  scoreCard: {
    alignItems: "center",
    bottom: 84,
    backgroundColor: "rgba(203, 180, 154, 0.58)",
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 100,
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: "absolute",
    right: 16,
    zIndex: 4,
  },
  scoreCardHint: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  scoreCardSub: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 15,
    marginTop: 3,
  },
  scoreCardValue: {
    color: theme.color.white,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "500",
    lineHeight: 36,
  },
  screen: {
    backgroundColor: theme.color.cream,
    flex: 1,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetCloseButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sheetCloseText: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
  },
  sheetEmpty: {
    color: theme.color.inkSoft,
    marginTop: 12,
  },
  sheetHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetHeaderText: {
    flex: 1,
    paddingRight: 12,
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
  sheetScrollContent: {
    paddingBottom: 10,
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
  feedActionBar: {
    alignItems: "center",
    backgroundColor: "rgba(116, 99, 83, 0.56)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    borderWidth: 1,
    bottom: 84,
    flexDirection: "row",
    left: 16,
    minHeight: 48,
    paddingHorizontal: 10,
    position: "absolute",
    zIndex: 4,
  },
  feedActionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 84,
    paddingHorizontal: 6,
  },
  feedActionButtonMeta: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    fontWeight: "500",
  },
  feedActionButtonText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  feedActionDivider: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 22,
    marginHorizontal: 4,
    width: 1,
  },
  itemsPill: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.62)",
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 108,
    paddingHorizontal: 14,
    position: "absolute",
    right: 18,
    zIndex: 4,
  },
  itemsPillIcon: {
    height: 28,
    left: 10,
    position: "absolute",
    width: 28,
  },
  itemsPillLabel: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
    paddingLeft: 18,
    textAlign: "center",
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
  tagChipEmpty: {
    color: theme.color.inkSoft,
    fontSize: 13,
  },
  tagChipText: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "700",
  },
  tagActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  tagHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  tagLinkPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(234,47,35,0.08)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagLinkPillBlocked: {
    backgroundColor: "rgba(234,47,35,0.15)",
  },
  tagLinkPillMuted: {
    backgroundColor: "rgba(216,206,194,0.45)",
  },
  tagLinkPillText: {
    color: theme.color.accentBright,
    fontSize: 11,
    fontWeight: "700",
  },
  tagLinkPillTextBlocked: {
    color: theme.color.accentBright,
  },
  tagMetaChip: {
    backgroundColor: "rgba(233,223,212,0.62)",
    borderRadius: theme.radius.pill,
    color: theme.color.inkSoft,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textTransform: "capitalize",
  },
  tagMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagName: {
    color: theme.color.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  tagOpenButton: {
    backgroundColor: "rgba(234,47,35,0.10)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagOpenButtonBlocked: {
    backgroundColor: "rgba(234,47,35,0.16)",
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
  tagStatusText: {
    color: theme.color.accentBright,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
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
