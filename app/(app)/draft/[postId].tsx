import { VideoView, useVideoPlayer } from "expo-video";
import { Link, useLocalSearchParams } from "expo-router";
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

import { theme } from "../../../src/constants";
import { useAuth } from "../../../src/features/auth";
import { supabase } from "../../../src/lib/supabaseClient";
import { validateClothingTagUrl } from "../../../src/utils";

const CATEGORY_OPTIONS = [
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "other",
] as const;

type DraftPost = {
  caption: string;
  created_at?: string;
  creator_id?: string;
  id: string;
  status: "draft" | "published";
  video_url: string;
};

type ClothingTag = {
  brand: string | null;
  category: string;
  id: string;
  name: string;
  url: string;
};

export default function DraftPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuth();

  const [post, setPost] = useState<DraftPost | null>(null);
  const [tags, setTags] = useState<ClothingTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagCategory, setTagCategory] = useState<string>("other");
  const [tagBrand, setTagBrand] = useState("");
  const [tagUrl, setTagUrl] = useState("");

  const postPlayer = useVideoPlayer(post?.video_url ?? null, (player) => {
    player.loop = true;
  });

  const loadPostAndTags = async () => {
    if (!user || !postId) {
      setStatusMessage("Missing user session or post id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const { data: postData, error: postError } = await supabase
      .from("video_posts")
      .select("id, caption, status, video_url, creator_id, created_at")
      .eq("id", postId)
      .eq("creator_id", user.id)
      .single();

    if (postError) {
      setStatusMessage(`Failed to load draft post: ${postError.message}`);
      setIsLoading(false);
      return;
    }

    setPost(postData);

    const { data: tagData, error: tagError } = await supabase
      .from("clothing_tags")
      .select("id, name, category, brand, url")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (tagError) {
      setStatusMessage(`Failed to load tags: ${tagError.message}`);
      setIsLoading(false);
      return;
    }

    setTags(tagData ?? []);
    if (postData.status !== "draft") {
      setStatusMessage("This post is already published.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadPostAndTags();
  }, [postId, user?.id]);

  const resetTagForm = () => {
    setEditingTagId(null);
    setTagName("");
    setTagCategory("other");
    setTagBrand("");
    setTagUrl("");
  };

  const saveTag = async () => {
    if (!user || !postId) {
      setStatusMessage("Missing user session or post id.");
      return;
    }

    const cleanName = tagName.trim();
    const cleanBrand = tagBrand.trim();
    const validation = validateClothingTagUrl(tagUrl);

    if (!cleanName) {
      setStatusMessage("Tag name is required.");
      return;
    }

    if (!validation.valid) {
      setStatusMessage(validation.error);
      return;
    }

    if (post?.status !== "draft") {
      setStatusMessage("Published posts can't be edited.");
      return;
    }

    setIsSavingTag(true);
    setStatusMessage(null);

    const payload = {
      brand: cleanBrand.length > 0 ? cleanBrand : null,
      category: tagCategory.trim() || "other",
      creator_id: user.id,
      name: cleanName,
      post_id: postId,
      url: validation.normalized,
    };

    if (editingTagId) {
      const { error } = await supabase
        .from("clothing_tags")
        .update(payload)
        .eq("id", editingTagId)
        .eq("post_id", postId);

      setIsSavingTag(false);
      if (error) {
        setStatusMessage(`Failed to update tag: ${error.message}`);
        return;
      }

      setStatusMessage("Tag updated.");
      resetTagForm();
      await loadPostAndTags();
      return;
    }

    const { error } = await supabase.from("clothing_tags").insert(payload);
    setIsSavingTag(false);

    if (error) {
      setStatusMessage(`Failed to add tag: ${error.message}`);
      return;
    }

    setStatusMessage("Tag added.");
    resetTagForm();
    await loadPostAndTags();
  };

  const deleteTag = async (tagId: string) => {
    if (!postId) {
      return;
    }

    if (post?.status !== "draft") {
      setStatusMessage("Published posts can't be edited.");
      return;
    }

    setStatusMessage(null);
    const { error } = await supabase
      .from("clothing_tags")
      .delete()
      .eq("id", tagId)
      .eq("post_id", postId);

    if (error) {
      setStatusMessage(`Failed to delete tag: ${error.message}`);
      return;
    }

    setStatusMessage("Tag deleted.");
    if (editingTagId === tagId) {
      resetTagForm();
    }
    await loadPostAndTags();
  };

  const startEdit = (tag: ClothingTag) => {
    if (post?.status !== "draft") {
      setStatusMessage("Published posts can't be edited.");
      return;
    }
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagCategory(tag.category || "other");
    setTagBrand(tag.brand ?? "");
    setTagUrl(tag.url);
    setStatusMessage(null);
  };

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Draft post</Text>
        <Text style={styles.errorText}>
          {statusMessage ?? "Draft post not found."}
        </Text>
      </View>
    );
  }

  const publishDraft = async () => {
    if (!postId) {
      setStatusMessage("Missing post id.");
      return;
    }

    if (post.status === "published") {
      setStatusMessage("This post is already published.");
      return;
    }

    if (tags.length === 0) {
      setStatusMessage("Add at least one tag before publishing.");
      return;
    }

    setStatusMessage(null);
    setIsPublishing(true);

    const { error } = await supabase.rpc("publish_post", { post_id: postId });
    setIsPublishing(false);

    if (error) {
      const message = (error.message ?? "").toLowerCase();
      if (message.includes("post_requires_at_least_one_tag")) {
        setStatusMessage("Add at least one tag before publishing.");
        return;
      }
      if (
        message.includes("not_post_owner") ||
        message.includes("auth_required") ||
        message.includes("permission")
      ) {
        setStatusMessage("You are not allowed to publish this post.");
        return;
      }
      if (message.includes("post_already_published")) {
        setStatusMessage("This post is already published.");
        setPost({ ...post, status: "published" });
        return;
      }
      setStatusMessage(`Publish failed: ${error.message}`);
      return;
    }

    setPost({ ...post, status: "published" });
    setStatusMessage("Post published successfully.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Draft post</Text>
      <Text style={styles.copy}>Post ID: {post.id}</Text>
      <Text style={styles.copy}>Status: {post.status}</Text>
      <Text style={styles.copy}>Caption: {post.caption || "(empty)"}</Text>

      <VideoView
        player={postPlayer}
        style={styles.video}
        contentFit="contain"
        nativeControls
      />

      <Pressable
        onPress={publishDraft}
        disabled={isPublishing || post.status === "published"}
        style={[
          styles.publishButton,
          isPublishing || post.status === "published"
            ? styles.publishButtonDisabled
            : undefined,
        ]}
      >
        <Text style={styles.publishButtonText}>
          {post.status === "published"
            ? "Published"
            : isPublishing
              ? "Publishing..."
              : "Publish"}
        </Text>
      </Pressable>

      {post.status === "published" ? (
        <Link href="/(app)/published" style={styles.feedLink}>
          View in feed
        </Link>
      ) : null}

      <Text style={styles.sectionTitle}>
        {editingTagId ? "Edit tag" : "Add tag"}
      </Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={tagName}
        onChangeText={setTagName}
        placeholder="e.g. White sneakers"
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryWrap}>
        {CATEGORY_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => setTagCategory(option)}
            style={[
              styles.categoryButton,
              tagCategory === option ? styles.categoryButtonActive : undefined,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                tagCategory === option ? styles.categoryTextActive : undefined,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Brand</Text>
      <TextInput
        style={styles.input}
        value={tagBrand}
        onChangeText={setTagBrand}
        placeholder="Optional"
      />

      <Text style={styles.label}>URL *</Text>
      <TextInput
        style={styles.input}
        value={tagUrl}
        onChangeText={setTagUrl}
        placeholder="https://..."
        autoCapitalize="none"
      />

      <Pressable
        onPress={saveTag}
        disabled={isSavingTag}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {isSavingTag
            ? "Saving..."
            : editingTagId
              ? "Save tag changes"
              : "Add tag"}
        </Text>
      </Pressable>

      {editingTagId ? (
        <Pressable onPress={resetTagForm} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel edit</Text>
        </Pressable>
      ) : null}

      {statusMessage ? (
        <Text style={styles.statusText}>{statusMessage}</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Tags ({tags.length})</Text>
      {tags.length === 0 ? (
        <Text style={styles.copy}>No tags yet.</Text>
      ) : null}

      {tags.map((tag) => (
        <View key={tag.id} style={styles.tagCard}>
          <Text style={styles.tagName}>{tag.name}</Text>
          <Text style={styles.tagMeta}>Category: {tag.category || "other"}</Text>
          <Text style={styles.tagMeta}>Brand: {tag.brand || "-"}</Text>
          <Text style={styles.tagMeta}>URL: {tag.url}</Text>
          <View style={styles.tagActions}>
            <Pressable onPress={() => startEdit(tag)} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={() => void deleteTag(tag.id)}
              style={[styles.smallButton, styles.deleteButton]}
            >
              <Text style={styles.smallButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  categoryButton: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButtonActive: {
    backgroundColor: theme.color.accent,
    borderColor: theme.color.accent,
  },
  categoryText: {
    color: theme.color.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: theme.color.white,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  container: {
    backgroundColor: theme.color.bg,
    padding: 16,
  },
  copy: {
    color: theme.color.muted,
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: theme.color.danger,
  },
  errorText: {
    color: theme.color.danger,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
  },
  feedLink: {
    color: theme.color.accent,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  label: {
    color: theme.color.ink,
    fontWeight: "600",
    marginBottom: 6,
  },
  loaderWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginTop: 6,
    paddingVertical: 12,
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginTop: 14,
    paddingVertical: 12,
  },
  publishButtonDisabled: {
    backgroundColor: "#cc9b95",
  },
  publishButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#8f7d70",
    borderRadius: theme.radius.pill,
    marginTop: 8,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 18,
  },
  smallButton: {
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  statusText: {
    marginTop: 10,
  },
  tagActions: {
    flexDirection: "row",
    marginTop: 10,
  },
  tagCard: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  tagMeta: {
    color: theme.color.muted,
    fontSize: 12,
    marginTop: 2,
  },
  tagName: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 10,
  },
  video: {
    backgroundColor: "#000",
    borderRadius: 8,
    height: 220,
    marginTop: 10,
    width: "100%",
  },
});
