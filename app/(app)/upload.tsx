import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  REQUIRE_TAG_URLS,
  TAG_CATEGORY_OPTIONS,
  theme,
  type TagCategory,
} from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import { supabase } from "../../src/lib/supabaseClient";
import { BrandMark } from "../../src/ui";
import { validateClothingTagUrl } from "../../src/utils";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

type PickedVideo = {
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uri: string;
};

type PendingTag = {
  brand: string;
  category: TagCategory;
  id: string;
  name: string;
  url: string;
};

type SubmitMode = "draft" | "published";

type SubmitResult = {
  message: string;
  postId: string;
  status: SubmitMode;
};

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function inferExtension(video: PickedVideo) {
  const source = video.fileName ?? video.uri;
  const parts = source.split(".");
  const last = parts[parts.length - 1];
  if (!last || last.includes("/")) {
    return "mp4";
  }
  return last.toLowerCase();
}

function createUuidLike() {
  const randomHex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .slice(1);
  return `${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}${randomHex()}${randomHex()}`;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? createUuidLike();
}

function getPublishFailureMessage(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  if (
    message.includes("not_post_owner") ||
    message.includes("auth_required") ||
    message.includes("permission")
  ) {
    return "Draft saved, but publish failed because this account is not allowed to publish it.";
  }
  if (message.includes("post_already_published")) {
    return "This post was already published.";
  }
  return `Draft saved, but publish failed: ${errorMessage}`;
}

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [caption, setCaption] = useState("");
  const [pickedVideo, setPickedVideo] = useState<PickedVideo | null>(null);
  const [tags, setTags] = useState<PendingTag[]>([]);
  const [tagName, setTagName] = useState("");
  const [tagCategory, setTagCategory] = useState<TagCategory>("other");
  const [tagBrand, setTagBrand] = useState("");
  const [tagUrl, setTagUrl] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const previewPlayer = useVideoPlayer(pickedVideo?.uri ?? null, (player) => {
    player.loop = true;
  });

  const resetTagForm = () => {
    setEditingTagId(null);
    setTagName("");
    setTagCategory("other");
    setTagBrand("");
    setTagUrl("");
  };

  const resetComposer = () => {
    setCaption("");
    setPickedVideo(null);
    setTags([]);
    resetTagForm();
  };

  const pickVideo = async () => {
    setStatusMessage(null);
    setSubmitResult(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage("Media library permission is required to pick a video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ["videos"],
      quality: 1,
    });

    if (result.canceled) {
      setStatusMessage("Video selection canceled.");
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      setStatusMessage("No video selected.");
      return;
    }

    if (asset.type && asset.type !== "video") {
      setStatusMessage("Please select a video file.");
      return;
    }

    if (asset.fileSize && asset.fileSize > MAX_VIDEO_BYTES) {
      setStatusMessage(
        `Selected file is too large (${formatBytes(asset.fileSize)}). Please choose a smaller video.`
      );
      setPickedVideo(null);
      return;
    }

    setPickedVideo({
      fileName: asset.fileName ?? null,
      fileSize: asset.fileSize ?? null,
      mimeType: asset.mimeType ?? null,
      uri: asset.uri,
    });
    setStatusMessage("Video selected. Add your caption and tags, then publish.");
  };

  const saveTag = () => {
    const cleanName = tagName.trim();
    const cleanBrand = tagBrand.trim();
    const validation = validateClothingTagUrl(tagUrl, {
      requireUrl: REQUIRE_TAG_URLS,
    });

    if (!cleanName) {
      setStatusMessage("Tag name is required.");
      return;
    }

    if (!validation.valid) {
      setStatusMessage(validation.error);
      return;
    }

    const nextTag: PendingTag = {
      brand: cleanBrand,
      category: tagCategory,
      id: editingTagId ?? createId(),
      name: cleanName,
      url: validation.present ? validation.normalized : "",
    };

    setTags((currentTags) => {
      if (!editingTagId) {
        return [nextTag, ...currentTags];
      }

      return currentTags.map((tag) => (tag.id === editingTagId ? nextTag : tag));
    });

    setStatusMessage(editingTagId ? "Tag updated." : "Tag added.");
    resetTagForm();
  };

  const startEditTag = (tag: PendingTag) => {
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagCategory(tag.category);
    setTagBrand(tag.brand);
    setTagUrl(tag.url);
    setStatusMessage(null);
  };

  const removeTag = (tagId: string) => {
    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId));
    if (editingTagId === tagId) {
      resetTagForm();
    }
    setStatusMessage("Tag removed.");
  };

  const submitPost = async (mode: SubmitMode) => {
    if (!user) {
      setStatusMessage("You must be signed in.");
      return;
    }

    if (!pickedVideo) {
      setStatusMessage("Pick a video first.");
      return;
    }

    if (mode === "published" && tags.length === 0) {
      setStatusMessage("Add at least one tag before publishing. You can still save a draft without tags.");
      return;
    }

    if (editingTagId || tagName.trim() || tagBrand.trim() || tagUrl.trim()) {
      setStatusMessage("Save or clear the tag form before continuing.");
      return;
    }

    const normalizedTags = [];
    for (const tag of tags) {
      const validation = validateClothingTagUrl(tag.url, {
        requireUrl: REQUIRE_TAG_URLS,
      });

      if (!tag.name.trim()) {
        setStatusMessage("Every tag needs a name.");
        return;
      }

      if (!validation.valid) {
        setStatusMessage(`Tag "${tag.name}" has an invalid URL.`);
        return;
      }

      normalizedTags.push({
        brand: tag.brand.trim() || null,
        category: tag.category,
        creator_id: user.id,
        name: tag.name.trim(),
        url: validation.present ? validation.normalized : null,
      });
    }

    setStatusMessage(null);
    setSubmitMode(mode);
    setSubmitResult(null);

    const postId = createId();
    const extension = inferExtension(pickedVideo);
    const filePath = `${user.id}/${postId}/${Date.now()}.${extension}`;

    try {
      const response = await fetch(pickedVideo.uri);
      if (!response.ok) {
        throw new Error("Unable to read selected video.");
      }

      const videoBytes = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, videoBytes, {
          contentType: pickedVideo.mimeType ?? `video/${extension}`,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      const { data: insertedPost, error: insertError } = await supabase
        .from("video_posts")
        .insert({
          caption: caption.trim(),
          creator_id: user.id,
          id: postId,
          status: "draft",
          video_url: publicUrl,
        })
        .select("id")
        .single();

      if (insertError) {
        await supabase.storage.from("videos").remove([filePath]);
        throw new Error(`Draft post creation failed: ${insertError.message}`);
      }

      if (normalizedTags.length > 0) {
        const { error: tagInsertError } = await supabase.from("clothing_tags").insert(
          normalizedTags.map((tag) => ({
            ...tag,
            post_id: insertedPost.id,
          }))
        );

        if (tagInsertError) {
          setSubmitResult({
            message: `Draft saved, but tags failed to save: ${tagInsertError.message}`,
            postId: insertedPost.id,
            status: "draft",
          });
          resetComposer();
          return;
        }
      }

      if (mode === "published") {
        const { error: publishError } = await supabase.rpc("publish_post", {
          post_id: insertedPost.id,
        });

        if (publishError) {
          setSubmitResult({
            message: getPublishFailureMessage(publishError.message),
            postId: insertedPost.id,
            status: "draft",
          });
          resetComposer();
          return;
        }
      }

      setSubmitResult({
        message:
          mode === "published"
            ? "Post published. It is now live in the feed."
            : "Draft saved. You can come back and finish it any time.",
        postId: insertedPost.id,
        status: mode,
      });
      resetComposer();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected upload error.";
      setStatusMessage(message);
    } finally {
      setSubmitMode(null);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroGlow} />

      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <BrandMark compact size={48} variant="chrome" />
          <View>
            <Text style={styles.eyebrow}>Create</Text>
            <Text style={styles.title}>Post Your Fit</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.replace("/(app)")}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <Pressable onPress={pickVideo} style={styles.uploadPanel}>
        {pickedVideo ? (
          <VideoView
            contentFit="cover"
            nativeControls
            player={previewPlayer}
            style={styles.panelPreview}
          />
        ) : (
          <View style={styles.panelEmptyState}>
            <View style={styles.uploadBadge}>
              <Text style={styles.uploadBadgeArrow}>↑</Text>
            </View>
            <Text style={styles.panelTitle}>Upload Video</Text>
            <Text style={styles.panelCopy}>Tap to select from gallery</Text>
          </View>
        )}
      </Pressable>

      {pickedVideo ? (
        <View style={styles.metaWrap}>
          <Text style={styles.meta}>Selected: {pickedVideo.fileName ?? "video"}</Text>
          <Text style={styles.meta}>
            Size: {pickedVideo.fileSize ? formatBytes(pickedVideo.fileSize) : "Unknown"}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>Caption</Text>
      <TextInput
        onChangeText={setCaption}
        placeholder="Add a caption..."
        style={styles.input}
        value={caption}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Clothing tags</Text>
        <Text style={styles.sectionBadge}>
          {tags.length} {tags.length === 1 ? "tag" : "tags"}
        </Text>
      </View>
      <Text style={styles.helperText}>
        Add at least one tag to publish. If you are not ready, save a draft and finish it
        later.
      </Text>

      <Text style={styles.label}>Name *</Text>
      <TextInput
        onChangeText={setTagName}
        placeholder="e.g. White sneakers"
        style={styles.input}
        value={tagName}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryWrap}>
        {TAG_CATEGORY_OPTIONS.map((option) => (
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
        onChangeText={setTagBrand}
        placeholder="Optional"
        style={styles.input}
        value={tagBrand}
      />

      <Text style={styles.label}>{REQUIRE_TAG_URLS ? "URL *" : "URL"}</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setTagUrl}
        placeholder={REQUIRE_TAG_URLS ? "https://..." : "Optional https://..."}
        style={styles.input}
        value={tagUrl}
      />
      <Text style={styles.helperText}>
        {REQUIRE_TAG_URLS
          ? "Use a safe http:// or https:// link."
          : "Leave empty to save a non-clickable tag, or add a safe http:// / https:// link."}
      </Text>

      <Pressable onPress={saveTag} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>
          {editingTagId ? "Save tag changes" : "Add tag"}
        </Text>
      </Pressable>

      {editingTagId ? (
        <Pressable onPress={resetTagForm} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel edit</Text>
        </Pressable>
      ) : null}

      {tags.length === 0 ? (
        <Text style={styles.emptyText}>No tags added yet.</Text>
      ) : (
        <View style={styles.tagList}>
          {tags.map((tag) => (
            <View key={tag.id} style={styles.tagCard}>
              <Text style={styles.tagName}>{tag.name}</Text>
              <Text style={styles.tagMeta}>Category: {tag.category}</Text>
              <Text style={styles.tagMeta}>Brand: {tag.brand || "-"}</Text>
              <Text style={styles.tagMeta}>
                URL: {tag.url || "No outbound link"}
              </Text>
              <View style={styles.tagActions}>
                <Pressable
                  onPress={() => startEditTag(tag)}
                  style={styles.smallButton}
                >
                  <Text style={styles.smallButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => removeTag(tag.id)}
                  style={[styles.smallButton, styles.deleteButton]}
                >
                  <Text style={styles.smallButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        disabled={submitMode !== null || !pickedVideo}
        onPress={() => void submitPost("published")}
        style={[
          styles.button,
          submitMode !== null || !pickedVideo
            ? styles.disabledButton
            : styles.uploadButton,
        ]}
      >
        <Text style={styles.buttonText}>
          {submitMode === "published" ? "Publishing..." : "Publish post"}
        </Text>
      </Pressable>

      <Pressable
        disabled={submitMode !== null || !pickedVideo}
        onPress={() => void submitPost("draft")}
        style={[
          styles.secondaryCtaButton,
          submitMode !== null || !pickedVideo
            ? styles.secondaryDisabledButton
            : undefined,
        ]}
      >
        <Text style={styles.secondaryCtaButtonText}>
          {submitMode === "draft" ? "Saving..." : "Save draft"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

      {submitResult ? (
        <View style={styles.successWrap}>
          <Text style={styles.successTitle}>
            {submitResult.status === "published" ? "Post ready" : "Draft ready"}
          </Text>
          <Text style={styles.successCopy}>{submitResult.message}</Text>
          {submitResult.status === "published" ? (
            <Link href="/(app)" style={styles.linkText}>
              Go to feed
            </Link>
          ) : (
            <Link
              href={`/(app)/draft/${submitResult.postId}`}
              style={styles.linkText}
            >
              Open draft
            </Link>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingVertical: 14,
    shadowColor: "#9f8270",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  buttonText: {
    color: theme.color.white,
    fontSize: 15,
    fontWeight: "700",
  },
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
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,246,0.88)",
    borderColor: "rgba(216,206,194,0.9)",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  closeText: {
    color: theme.color.inkSoft,
    fontSize: 30,
    fontWeight: "300",
    lineHeight: 30,
  },
  container: {
    backgroundColor: theme.color.shell,
    flexGrow: 1,
    padding: 18,
    paddingBottom: 140,
  },
  deleteButton: {
    backgroundColor: theme.color.danger,
  },
  disabledButton: {
    backgroundColor: "#d8a8a2",
  },
  emptyText: {
    color: theme.color.muted,
    marginTop: 10,
  },
  eyebrow: {
    color: theme.color.inkSoft,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  helperText: {
    color: theme.color.muted,
    fontSize: 12,
    marginBottom: 10,
    marginTop: -2,
  },
  heroGlow: {
    backgroundColor: "rgba(236, 221, 205, 0.66)",
    borderRadius: 260,
    height: 280,
    left: 78,
    position: "absolute",
    top: 84,
    width: 280,
  },
  input: {
    backgroundColor: "rgba(255,250,246,0.92)",
    borderColor: "rgba(216,206,194,0.9)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    padding: 12,
  },
  label: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 16,
  },
  linkText: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  meta: {
    color: theme.color.inkSoft,
    fontSize: 12,
  },
  metaWrap: {
    backgroundColor: "rgba(255,249,243,0.82)",
    borderColor: "rgba(216,206,194,0.8)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginTop: 10,
    padding: 10,
  },
  panelCopy: {
    color: theme.color.inkSoft,
    fontSize: 16,
    marginTop: 8,
  },
  panelEmptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
  panelPreview: {
    borderRadius: 34,
    height: "100%",
    width: "100%",
  },
  panelTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.9)",
    borderColor: "rgba(216,206,194,0.92)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: theme.color.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryCtaButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.82)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginTop: 10,
    paddingVertical: 14,
  },
  secondaryCtaButtonText: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryDisabledButton: {
    opacity: 0.6,
  },
  sectionBadge: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  sectionTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
  },
  smallButton: {
    alignItems: "center",
    backgroundColor: theme.color.inkSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 12,
  },
  successCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
  },
  successTitle: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  successWrap: {
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  tagActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  tagCard: {
    backgroundColor: "rgba(255,249,243,0.82)",
    borderColor: "rgba(216,206,194,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  tagList: {
    marginTop: 2,
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
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
  },
  titleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  uploadBadge: {
    alignItems: "center",
    backgroundColor: "rgba(140,120,110,0.08)",
    borderRadius: 999,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  uploadBadgeArrow: {
    color: theme.color.inkSoft,
    fontSize: 40,
    fontWeight: "300",
    marginTop: -6,
  },
  uploadButton: {
    backgroundColor: theme.color.accentBright,
  },
  uploadPanel: {
    alignItems: "center",
    backgroundColor: "rgba(245,238,231,0.86)",
    borderColor: "rgba(216,206,194,0.82)",
    borderRadius: 28,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: 396,
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
});
