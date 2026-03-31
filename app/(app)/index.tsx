import { Link, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";

import { theme } from "../../src/constants";
import {
  logOutboundClickBestEffort,
  shouldLogOutboundClick,
} from "../../src/features/analytics";
import { useAuth } from "../../src/features/auth";
import {
  buildLinkReportDetails,
  ReportComposer,
  submitReport,
  type ReportTargetType,
} from "../../src/features/reports";
import { supabase } from "../../src/lib/supabaseClient";
import { validateClothingTagUrl } from "../../src/utils";

const PAGE_SIZE = 8;

type FeedTag = {
  brand: string | null;
  category: string | null;
  id: string;
  name: string;
  url: string;
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

type FeedVideoCardProps = {
  active: boolean;
  avgGradeText: string;
  captionExpanded: boolean;
  gradeLocked: boolean;
  height: number;
  onOpenGradeSheet: () => void;
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
  gradeLocked,
  height,
  onOpenGradeSheet,
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
  const previewTags = post.tags.slice(0, 3);
  const captionPreview = getCaptionPreview(post.caption);
  const captionText = captionExpanded
    ? post.caption.trim() || "Fresh fit, no caption yet."
    : captionPreview.text;

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
      <View style={[styles.topStrip, { top: topInset + 10 }]}>
        <View style={styles.topStripTags}>
          {previewTags.length > 0 ? (
            previewTags.map((tag) => (
              <View key={tag.id} style={styles.topTagChip}>
                <Text style={styles.tagChipText}>{tag.brand ?? tag.name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.tagChipEmpty}>No tags yet</Text>
          )}
        </View>
        <View style={styles.topStripActions}>
          <Text style={styles.topUsername}>@{post.creator_username}</Text>
          <Pressable onPress={onRevealItems} style={styles.topActionButton}>
            <Text style={styles.topActionText}>Items</Text>
          </Pressable>
          <Pressable onPress={onReportProfile} style={styles.topActionButtonMuted}>
            <Text style={styles.topActionTextMuted}>Report profile</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sideRail}>
        <Pressable onPress={onOpenGradeSheet} style={styles.scoreOrb}>
          <Text style={styles.scoreOrbValue}>{avgGradeText}</Text>
          <Text style={styles.scoreOrbLabel}>
            {userGrade != null ? `Yours ${userGrade}` : "Tap to rate"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.bottomOverlay}>
        <Text style={styles.bottomUsername}>@{post.creator_username}</Text>
        <Pressable onPress={onToggleCaption}>
          <Text numberOfLines={captionExpanded ? 5 : 2} style={styles.caption}>
            {captionText}
          </Text>
          {captionPreview.truncated ? (
            <Text style={styles.expandCopy}>
              {captionExpanded ? "Show less" : "More"}
            </Text>
          ) : null}
        </Pressable>
        <Pressable onPress={onReportPost} style={styles.reportTextWrap}>
          <Text style={styles.reportText}>Report post</Text>
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

export default function FeedScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const cardHeight = Math.max(height - 72, 520);

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
  const [gradeMessageByPost, setGradeMessageByPost] = useState<
    Record<string, string | null>
  >({});
  const [gradeSubmittingPostId, setGradeSubmittingPostId] = useState<
    string | null
  >(null);
  const [gradeStatsByPost, setGradeStatsByPost] = useState<
    Record<string, { avg: number | null; count: number; userGrade: number | null }>
  >({});
  const gradeCooldownUntilRef = useRef<Record<string, number>>({});

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

  const openReportComposer = (draft: ReportDraft) => {
    setReportDraft(draft);
    setReportMessage(null);
  };

  const refreshGradeStats = async (postIds: string[]) => {
    if (postIds.length === 0) {
      return;
    }

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
  };

  useFocusEffect(
    useCallback(() => {
      setIsFeedFocused(true);
      if (posts.length === 0 && !isLoading) {
        void loadPosts(0, true);
      }
      return () => {
        setIsFeedFocused(false);
      };
    }, [isLoading, posts.length])
  );

  const loadPosts = async (nextOffset: number, reset: boolean) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setFeedMessage(null);

    const rangeFrom = nextOffset;
    const rangeTo = nextOffset + PAGE_SIZE - 1;

    const { data: rawPosts, error: postsError } = await supabase
      .from("video_posts")
      .select("id, creator_id, caption, created_at, video_url, clothing_tags(id, name, brand, category, url)")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (postsError) {
      setIsLoading(false);
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
    setIsLoading(false);

    const knownIds = posts.map((post) => post.id);
    const mergedIds = Array.from(
      new Set(
        reset
          ? mappedPosts.map((post) => post.id)
          : [...knownIds, ...mappedPosts.map((post) => post.id)]
      )
    );
    await refreshGradeStats(mergedIds);
  };

  useEffect(() => {
    void loadPosts(0, true);
  }, []);

  const submitGrade = async (postId: string, value: number) => {
    if (value < 1 || value > 10) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Pick a number from 1 to 10.",
      }));
      return;
    }
    if (!user) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Sign in required.",
      }));
      return;
    }
    if (gradeStatsByPost[postId]?.userGrade != null) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Already graded.",
      }));
      return;
    }

    const now = Date.now();
    const cooldownUntil = gradeCooldownUntilRef.current[postId] ?? 0;
    if (now < cooldownUntil) {
      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Please wait before grading again.",
      }));
      return;
    }

    gradeCooldownUntilRef.current[postId] = now + 2500;
    setGradeSubmittingPostId(postId);
    setGradeMessageByPost((current) => ({
      ...current,
      [postId]: null,
    }));

    const { error } = await supabase.from("grades").insert({
      post_id: postId,
      user_id: user.id,
      value,
    });

    setGradeSubmittingPostId(null);

    if (error) {
      const duplicate =
        error.code === "23505" ||
        (error.message ?? "").toLowerCase().includes("duplicate");
      if (duplicate) {
        setGradeMessageByPost((current) => ({
          ...current,
          [postId]: "Already graded.",
        }));
        await refreshGradeStats([postId]);
        return;
      }

      setGradeMessageByPost((current) => ({
        ...current,
        [postId]: "Could not submit grade. Check connection and try again.",
      }));
      return;
    }

    setGradeMessageByPost((current) => ({
      ...current,
      [postId]: "Grade submitted.",
    }));
    await refreshGradeStats([postId]);
  };

  const openRevealSheet = () => {
    setSheetMessage(null);
    setSheetVisible(true);
  };

  const openGradeSheet = (postId: string) => {
    setGradeSheetPostId(postId);
    setGradeSheetVisible(true);
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
    const validation = validateClothingTagUrl(tag.url);
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
            active={index === activeIndex && isFeedFocused}
            shouldMountVideo={Math.abs(index - activeIndex) <= 1}
            captionExpanded={expandedCaptionPostId === item.id}
            onToggleCaption={() => {
              setExpandedCaptionPostId((current) =>
                current === item.id ? null : item.id
              );
            }}
            onOpenGradeSheet={() => {
              openGradeSheet(item.id);
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
            userGrade={stats?.userGrade ?? null}
            gradeLocked={stats?.userGrade != null}
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
        animationType="slide"
        transparent
        onRequestClose={() => setGradeSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setGradeSheetVisible(false)}
        >
          <Pressable style={styles.sheetPanel} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Grade this fit</Text>
            <Text style={styles.sheetSubTitle}>
              {gradeSheetPost ? `@${gradeSheetPost.creator_username}` : "No post selected"}
            </Text>

            <Text style={styles.sheetScoreText}>
              Avg. {gradeSheetPost ? gradeStatsByPost[gradeSheetPost.id]?.avg?.toFixed(1) ?? "—" : "—"}
              {gradeSheetPost
                ? gradeStatsByPost[gradeSheetPost.id]?.userGrade != null
                  ? `  •  Yours ${gradeStatsByPost[gradeSheetPost.id]?.userGrade}`
                  : ""
                : ""}
            </Text>

            <View style={styles.sheetGradeRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={`sheet-grade-${value}`}
                  onPress={() => {
                    if (!gradeSheetPost) {
                      return;
                    }
                    void submitGrade(gradeSheetPost.id, value);
                  }}
                  disabled={!gradeSheetPost || gradeSubmittingPostId === gradeSheetPost.id}
                  style={[
                    styles.sheetGradeChip,
                    gradeSheetPost &&
                    gradeStatsByPost[gradeSheetPost.id]?.userGrade === value
                      ? styles.sheetGradeChipActive
                      : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetGradeChipText,
                      gradeSheetPost &&
                      gradeStatsByPost[gradeSheetPost.id]?.userGrade === value
                        ? styles.sheetGradeChipTextActive
                        : undefined,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetGradeRow}>
              {[6, 7, 8, 9, 10].map((value) => (
                <Pressable
                  key={`sheet-grade-${value}`}
                  onPress={() => {
                    if (!gradeSheetPost) {
                      return;
                    }
                    void submitGrade(gradeSheetPost.id, value);
                  }}
                  disabled={!gradeSheetPost || gradeSubmittingPostId === gradeSheetPost.id}
                  style={[
                    styles.sheetGradeChip,
                    gradeSheetPost &&
                    gradeStatsByPost[gradeSheetPost.id]?.userGrade === value
                      ? styles.sheetGradeChipActive
                      : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetGradeChipText,
                      gradeSheetPost &&
                      gradeStatsByPost[gradeSheetPost.id]?.userGrade === value
                        ? styles.sheetGradeChipTextActive
                        : undefined,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            {gradeSheetPost ? (
              <Text
                style={
                  gradeMessageByPost[gradeSheetPost.id]
                    ? styles.sheetMessage
                    : styles.sheetHelperText
                }
              >
                {gradeMessageByPost[gradeSheetPost.id] ??
                  "Tap a score to rate the fit. Ratings save once."}
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
                const link = validateClothingTagUrl(tag.url);
                const disabled = !link.valid;

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
                    <View style={styles.tagActionRow}>
                      <Pressable
                        onPress={() => {
                          if (disabled) {
                            setSheetMessage("Blocked unsafe link.");
                            return;
                          }
                          void openTagLink(tag);
                        }}
                        style={styles.tagOpenButton}
                      >
                        <Text style={styles.tagOpenText}>
                          {disabled ? "Unsafe link blocked" : "Open link"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          openReportComposer({
                            initialDetails: tag.url,
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
    bottom: 24,
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 4,
  },
  bottomUsername: {
    color: theme.color.white,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  caption: {
    color: theme.color.white,
    fontSize: 14,
    lineHeight: 19,
    maxWidth: "78%",
  },
  cardWrap: {
    backgroundColor: "#0d0806",
    overflow: "hidden",
    width: "100%",
  },
  centerText: {
    color: theme.color.ink,
    marginTop: 10,
    textAlign: "center",
  },
  expandCopy: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
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
    color: theme.color.white,
    fontSize: 16,
  },
  reportText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "700",
  },
  reportTextWrap: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  scoreOrb: {
    alignItems: "center",
    backgroundColor: "rgba(255, 249, 243, 0.88)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 82,
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  scoreOrbLabel: {
    color: theme.color.inkSoft,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  scoreOrbValue: {
    color: theme.color.accentBright,
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 30,
  },
  screen: {
    backgroundColor: theme.color.shell,
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
  sheetGradeChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: theme.radius.pill,
    marginRight: 10,
    marginTop: 10,
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  sheetGradeChipActive: {
    backgroundColor: theme.color.accentBright,
  },
  sheetGradeChipText: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  sheetGradeChipTextActive: {
    color: theme.color.white,
  },
  sheetGradeRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  sheetHelperText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    marginTop: 14,
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
    position: "absolute",
    right: 14,
    top: "44%",
    zIndex: 4,
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
  topActionButton: {
    backgroundColor: "rgba(234,47,35,0.14)",
    borderRadius: theme.radius.pill,
    marginLeft: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  topActionText: {
    color: theme.color.accentBright,
    fontSize: 13,
    fontWeight: "700",
  },
  topActionButtonMuted: {
    backgroundColor: "rgba(255,249,243,0.18)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  topActionTextMuted: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  topStrip: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.54)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    left: 12,
    minHeight: 62,
    paddingHorizontal: 12,
    position: "absolute",
    right: 12,
    zIndex: 4,
  },
  topStripActions: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 12,
  },
  topStripTags: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  topTagChip: {
    backgroundColor: "rgba(234,47,35,0.10)",
    borderRadius: theme.radius.pill,
    marginRight: 8,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topUsername: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "800",
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
    backgroundColor: "rgba(27, 19, 13, 0.12)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
