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
import { useAuth } from "../../src/features/auth";
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

type FeedVideoCardProps = {
  active: boolean;
  avgGradeText: string;
  gradeLocked: boolean;
  gradeMessage: string | null;
  gradeSubmitting: boolean;
  onGradePress: (value: number) => void;
  height: number;
  onRevealItems: () => void;
  post: FeedPost;
  shouldMountVideo: boolean;
  topInset: number;
  userGrade: number | null;
};

function FeedVideoCard({
  active,
  avgGradeText,
  gradeLocked,
  gradeMessage,
  gradeSubmitting,
  onGradePress,
  height,
  onRevealItems,
  post,
  shouldMountVideo,
  topInset,
  userGrade,
}: FeedVideoCardProps) {
  const player = useVideoPlayer(shouldMountVideo ? post.video_url : null, (videoPlayer) => {
    videoPlayer.loop = true;
  });

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

      <View style={[styles.overlayTopRight, { top: topInset + 12 }]}>
        <Link href="/(app)/upload" style={styles.overlayLink}>
          Upload
        </Link>
        <Link href="/(app)/account" style={styles.overlayLink}>
          Account
        </Link>
      </View>

      <View style={styles.overlayBottom}>
        <Text style={styles.username}>@{post.creator_username}</Text>
        <Text style={styles.caption}>{post.caption || "(no caption)"}</Text>
        <Text style={styles.avgGrade}>
          Avg grade: {avgGradeText}
          {userGrade != null ? `  •  Your grade: ${userGrade}` : ""}
        </Text>
        <View style={styles.gradeRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={`${post.id}-grade-${value}`}
              onPress={() => onGradePress(value)}
              disabled={gradeSubmitting}
              style={[
                styles.gradeChip,
                gradeLocked ? styles.gradeChipLocked : undefined,
                userGrade === value ? styles.gradeChipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.gradeChipText,
                  userGrade === value ? styles.gradeChipTextActive : undefined,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.gradeRow}>
          {[6, 7, 8, 9, 10].map((value) => (
            <Pressable
              key={`${post.id}-grade-${value}`}
              onPress={() => onGradePress(value)}
              disabled={gradeSubmitting}
              style={[
                styles.gradeChip,
                gradeLocked ? styles.gradeChipLocked : undefined,
                userGrade === value ? styles.gradeChipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.gradeChipText,
                  userGrade === value ? styles.gradeChipTextActive : undefined,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        {gradeMessage ? <Text style={styles.gradeMessage}>{gradeMessage}</Text> : null}
        <Pressable onPress={onRevealItems} style={styles.revealButton}>
          <Text style={styles.revealButtonText}>Reveal items</Text>
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

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [isFeedFocused, setIsFeedFocused] = useState(true);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMessage, setSheetMessage] = useState<string | null>(null);
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

  const openTagLink = async (url: string) => {
    const validation = validateClothingTagUrl(url);
    if (!validation.valid) {
      setSheetMessage("Blocked unsafe link.");
      return;
    }

    try {
      await WebBrowser.openBrowserAsync(validation.normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to open link.";
      setSheetMessage(message);
    }
  };

  const listFooter = useMemo(() => {
    if (isLoading) {
      return (
        <View style={[styles.footer, { height }]}>
          <Text style={styles.footerText}>Loading…</Text>
        </View>
      );
    }

    if (!hasMore) {
      return (
        <View style={[styles.footer, { height }]}>
          <Text style={styles.footerText}>No more posts</Text>
        </View>
      );
    }

    return null;
  }, [hasMore, height, isLoading]);

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
            height={height}
            active={index === activeIndex && isFeedFocused}
            shouldMountVideo={Math.abs(index - activeIndex) <= 1}
            onRevealItems={openRevealSheet}
            topInset={insets.top}
            avgGradeText={stats?.avg != null ? stats.avg.toFixed(1) : "—"}
            userGrade={stats?.userGrade ?? null}
            gradeLocked={stats?.userGrade != null}
            gradeSubmitting={gradeSubmittingPostId === item.id}
            gradeMessage={gradeMessageByPost[item.id] ?? null}
            onGradePress={(value) => {
              void submitGrade(item.id, value);
            }}
          />
          );
        }}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: height,
          offset: height * index,
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
                  <Pressable
                    key={tag.id}
                    style={[
                      styles.tagRow,
                      disabled ? styles.tagRowDisabled : undefined,
                    ]}
                    onPress={() => {
                      if (disabled) {
                        setSheetMessage("Blocked unsafe link.");
                        return;
                      }
                      void openTagLink(tag.url);
                    }}
                  >
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <Text style={styles.tagMeta}>Brand: {tag.brand || "-"}</Text>
                    <Text style={styles.tagMeta}>Category: {tag.category || "-"}</Text>
                    <Text style={styles.tagMeta}>{disabled ? "Unsafe link blocked" : "Open link"}</Text>
                  </Pressable>
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
  avgGrade: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  caption: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  cardWrap: {
    backgroundColor: "#000",
    width: "100%",
  },
  feedMessage: {
    backgroundColor: theme.color.accentSoft,
    borderRadius: theme.radius.md,
    color: theme.color.danger,
    left: 12,
    padding: 8,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 20,
  },
  fullscreenCenter: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    position: "absolute",
    width: "100%",
    zIndex: 10,
  },
  centerText: {
    color: theme.color.white,
    marginTop: 10,
  },
  gradeChip: {
    alignItems: "center",
    backgroundColor: "rgba(242,236,229,0.9)",
    borderRadius: theme.radius.pill,
    marginRight: 6,
    marginTop: 6,
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gradeChipLocked: {
    opacity: 0.72,
  },
  gradeChipActive: {
    backgroundColor: theme.color.accent,
  },
  gradeChipText: {
    color: theme.color.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  gradeChipTextActive: {
    color: theme.color.white,
  },
  gradeMessage: {
    color: "#fff",
    fontSize: 12,
    marginTop: 6,
  },
  gradeRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    backgroundColor: "#111",
    justifyContent: "center",
    width: "100%",
  },
  footerText: {
    color: "#fff",
    fontSize: 16,
  },
  overlayBottom: {
    backgroundColor: "rgba(24,18,12,0.34)",
    borderRadius: theme.radius.lg,
    bottom: 22,
    left: 12,
    padding: 12,
    position: "absolute",
    right: 12,
  },
  overlayLink: {
    backgroundColor: "rgba(242,236,229,0.94)",
    borderRadius: theme.radius.pill,
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  overlayTopRight: {
    alignItems: "flex-end",
    position: "absolute",
    right: 12,
  },
  placeholderText: {
    color: "#cfcfcf",
    fontSize: 16,
  },
  revealButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...theme.shadow.card,
  },
  revealButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  screen: {
    backgroundColor: "#000",
    flex: 1,
  },
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetEmpty: {
    color: "#555",
    marginTop: 12,
  },
  sheetMessage: {
    color: "#b00020",
    marginTop: 8,
  },
  sheetPanel: {
    backgroundColor: theme.color.bgPanel,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: "70%",
    padding: 16,
  },
  sheetSubTitle: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  sheetTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
  },
  tagMeta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  tagName: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  tagRow: {
    backgroundColor: theme.color.white,
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
  username: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  video: {
    height: "100%",
    width: "100%",
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
