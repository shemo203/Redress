import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../../src/constants";
import { useAuth } from "../../../src/features/auth";
import {
  addCommentToPost,
  COMMENT_MAX_LENGTH,
  fetchPostForComments,
  listCommentsForPost,
  type CommentablePost,
  type SocialComment,
} from "../../../src/features/social";
import { ProfileAvatar } from "../../../src/ui";

type LoadMode = "initial" | "refresh" | "silent";

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

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();

  const targetPostId = typeof postId === "string" ? postId : "";
  const submitCooldownUntilRef = useRef(0);

  const [comments, setComments] = useState<SocialComment[]>([]);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [composerText, setComposerText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState<CommentablePost | null>(null);

  const loadCommentsScreen = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!targetPostId) {
        setPost(null);
        setComments([]);
        setErrorMessage("Missing post id.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      }
      if (mode === "refresh") {
        setIsRefreshing(true);
      }

      const [postResult, commentsResult] = await Promise.all([
        fetchPostForComments(targetPostId),
        listCommentsForPost(targetPostId, 100),
      ]);

      if (postResult.error && __DEV__) {
        console.error("Failed to load comment post", postResult.error);
      }
      if (commentsResult.error && __DEV__) {
        console.error("Failed to load comments", commentsResult.error);
      }

      const nextPost = postResult.data;

      if (!nextPost) {
        setPost(null);
        setComments([]);
        setErrorMessage(
          postResult.error || commentsResult.error || "This post is unavailable."
        );
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setPost(nextPost);

      if (nextPost.status !== "published") {
        setComments([]);
        setErrorMessage("Comments are only available on published posts.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (commentsResult.error) {
        setErrorMessage(commentsResult.error);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setComments(sortCommentsOldestFirst(commentsResult.data));
      setErrorMessage(null);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [targetPostId]
  );

  useFocusEffect(
    useCallback(() => {
      void loadCommentsScreen("initial");
    }, [loadCommentsScreen])
  );

  const canComment = post?.status === "published";
  const remainingCharacters = useMemo(
    () => COMMENT_MAX_LENGTH - composerText.length,
    [composerText]
  );

  const handleSubmitComment = async () => {
    const normalizedComment = composerText.trim().slice(0, COMMENT_MAX_LENGTH);

    if (!canComment || !post) {
      setComposerMessage("Comments are only available on published posts.");
      return;
    }
    if (!user?.id) {
      setComposerMessage("Sign in required.");
      return;
    }
    if (!normalizedComment) {
      setComposerMessage("Write a comment first.");
      return;
    }

    const now = Date.now();
    if (now < submitCooldownUntilRef.current) {
      setComposerMessage("Please wait before posting again.");
      return;
    }

    submitCooldownUntilRef.current = now + 2000;
    setComposerMessage(null);
    setIsSubmitting(true);

    const optimisticId = `optimistic-${now}`;
    const optimisticComment: SocialComment = {
      created_at: new Date(now).toISOString(),
      id: optimisticId,
      post_id: post.id,
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

    setComments((current) =>
      sortCommentsOldestFirst([...current, optimisticComment])
    );
    setComposerText("");

    const result = await addCommentToPost(post.id, user.id, normalizedComment);

    if (result.error) {
      setComments((current) =>
        current.filter((comment) => comment.id !== optimisticId)
      );
      setComposerText(normalizedComment);
      setComposerMessage(result.error);
      if (__DEV__) {
        console.error("Failed to submit comment", result.error);
      }
      setIsSubmitting(false);
      return;
    }

    await loadCommentsScreen("silent");
    setComposerMessage("Comment posted.");
    setIsSubmitting(false);
  };

  const renderComment = ({ item }: { item: SocialComment }) => (
    <View style={styles.commentRow}>
      <ProfileAvatar
        avatarUrl={item.user.avatar_url}
        size={42}
        username={item.user.username}
      />
      <View style={styles.commentBody}>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentUsername}>@{item.user.username}</Text>
          <Text style={styles.commentTime}>{formatCommentTime(item.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View
        style={[
          styles.headerWrap,
          {
            paddingTop: Math.max(insets.top + 10, 24),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.postCard}>
          <Text style={styles.postLabel}>
            {comments.length === 1 ? "1 comment" : `${comments.length} comments`}
          </Text>
          <Text numberOfLines={2} style={styles.postCaption}>
            {post?.caption?.trim() || "Fresh fit, no caption yet."}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.color.accentBright} />
          <Text style={styles.centerStateText}>Loading comments…</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          refreshing={isRefreshing}
          onRefresh={() => {
            void loadCommentsScreen("refresh");
          }}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: Math.max(insets.bottom + 208, 228),
            },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {errorMessage
                  ? "Comments unavailable"
                  : canComment
                    ? "No comments yet"
                    : "Comments locked"}
              </Text>
              <Text style={styles.emptyText}>
                {errorMessage ||
                  (canComment
                    ? "Start the conversation with the first comment."
                    : "Comments are only available on published posts.")}
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.composerDock,
          {
            paddingBottom: Math.max(insets.bottom + 96, 110),
          },
        ]}
      >
        <View style={styles.composerCard}>
          <TextInput
            editable={canComment && !isSubmitting}
            maxLength={COMMENT_MAX_LENGTH}
            multiline
            onChangeText={setComposerText}
            placeholder={
              canComment ? "Add a comment" : "Comments are only available on published posts"
            }
            placeholderTextColor={theme.color.inkSoft}
            style={styles.composerInput}
            textAlignVertical="top"
            value={composerText}
          />

          <View style={styles.composerFooter}>
            <Text style={styles.characterCount}>{remainingCharacters}</Text>
            <Pressable
              disabled={!canComment || isSubmitting}
              onPress={() => void handleSubmitComment()}
              style={[
                styles.submitButton,
                !canComment || isSubmitting ? styles.submitButtonDisabled : undefined,
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>

          {composerMessage ? (
            <Text style={styles.composerMessage}>{composerMessage}</Text>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centerState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  centerStateText: {
    color: theme.color.inkSoft,
    marginTop: 10,
  },
  characterCount: {
    color: theme.color.inkSoft,
    fontSize: 12,
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
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    padding: 14,
  },
  commentText: {
    color: theme.color.ink,
    fontSize: 14,
    lineHeight: 21,
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
  composerCard: {
    backgroundColor: "rgba(255,249,243,0.96)",
    borderColor: "rgba(216,206,194,0.9)",
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  composerDock: {
    backgroundColor: "rgba(247,241,234,0.94)",
    borderTopColor: "rgba(216,206,194,0.72)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    position: "absolute",
    right: 0,
  },
  composerFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  composerInput: {
    color: theme.color.ink,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 110,
    minHeight: 70,
  },
  composerMessage: {
    color: theme.color.accentBright,
    fontSize: 12,
    marginTop: 10,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.88)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 6,
    padding: 24,
  },
  emptyText: {
    color: theme.color.inkSoft,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
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
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerSpacer: {
    minWidth: 78,
  },
  headerTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  headerWrap: {
    backgroundColor: theme.color.shell,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  listContent: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  postCaption: {
    color: theme.color.ink,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 6,
  },
  postCard: {
    backgroundColor: "rgba(232,221,208,0.82)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  postLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: theme.color.shell,
    flex: 1,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: theme.color.accentBright,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    minWidth: 88,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
