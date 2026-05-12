import { Link, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { REQUIRE_TAG_URLS, TAG_CATEGORY_OPTIONS, theme } from "../../../src/constants";
import { useAuth } from "../../../src/features/auth";
import { supabase } from "../../../src/lib/supabaseClient";
import { BrandMark } from "../../../src/ui";
import { chrome } from "../../../src/ui/chrome";
import { validateClothingTagUrl } from "../../../src/utils";

type DraftPost = {
  caption: string;
  created_at?: string;
  creator_id?: string;
  id: string;
  media_type: "image" | "video";
  status: "draft" | "published";
  video_url: string;
};

type ClothingTag = {
  brand: string | null;
  category: string;
  id: string;
  name: string;
  url: string | null;
};

export default function DraftPostScreen() {
  const insets = useSafeAreaInsets();
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

  const postPlayer = useVideoPlayer(
    post?.media_type === "video" ? post.video_url : null,
    (player) => {
      player.loop = true;
    }
  );

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
      .select("id, caption, status, video_url, media_type, creator_id, created_at")
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
    const validation = validateClothingTagUrl(tagUrl, {
      requireUrl: REQUIRE_TAG_URLS,
    });

    if (!cleanName) {
      setStatusMessage("Clothing name is required.");
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
      url: validation.present ? validation.normalized : null,
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
    setTagUrl(tag.url ?? "");
    setStatusMessage(null);
  };

  const publishDraft = async () => {
    if (!postId) {
      setStatusMessage("Missing post id.");
      return;
    }

    if (post?.status === "published") {
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
        setPost(post ? { ...post, status: "published" } : null);
        return;
      }
      setStatusMessage(`Publish failed: ${error.message}`);
      return;
    }

    setPost(post ? { ...post, status: "published" } : null);
    setStatusMessage("Post published successfully.");
  };

  if (isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={theme.color.accentBright} size="large" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={chrome.title}>Draft missing</Text>
        <Text style={styles.missingCopy}>{statusMessage ?? "Draft post not found."}</Text>
      </View>
    );
  }

  const progressSteps = [
    {
      complete: true,
      label: "Draft",
      meta: post.media_type,
    },
    {
      complete: tags.length > 0,
      label: "Tags",
      meta: tags.length > 0 ? `${tags.length} saved` : "need 1+",
    },
    {
      complete: post.status === "published",
      label: "Publish",
      meta: post.status === "published" ? "live" : "pending",
    },
  ];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 136, 164),
            paddingTop: Math.max(insets.top + 10, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={chrome.eyebrow}>Draft editor</Text>
            <Text style={chrome.title}>Finish the post</Text>
          </View>
          <BrandMark compact size={56} variant="chrome" />
        </View>

        <View style={[chrome.glassCard, styles.progressCard]}>
          <View style={styles.progressRow}>
            {progressSteps.map((step) => (
              <View
                key={step.label}
                style={[
                  chrome.progressChip,
                  step.complete ? chrome.progressChipComplete : chrome.progressChipActive,
                ]}
              >
                <Text
                  style={[
                    chrome.progressChipLabel,
                    step.complete
                      ? chrome.progressChipLabelComplete
                      : chrome.progressChipLabelActive,
                  ]}
                >
                  {step.label}
                </Text>
                <Text
                  style={[
                    chrome.progressChipMeta,
                    step.complete
                      ? chrome.progressChipMetaComplete
                      : chrome.progressChipMetaActive,
                  ]}
                >
                  {step.meta}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[chrome.glassCardSoft, styles.sectionCard]}>
          <Text style={chrome.eyebrow}>Preview</Text>
          <Text style={styles.cardTitle}>{post.caption || "Untitled fit"}</Text>
          <Text style={styles.metaText}>Post ID: {post.id}</Text>
          <Text style={styles.metaText}>Status: {post.status}</Text>

          <View style={styles.previewWrap}>
            {post.media_type === "image" ? (
              <Image source={{ uri: post.video_url }} style={styles.previewMedia} resizeMode="cover" />
            ) : (
              <VideoView
                player={postPlayer}
                style={styles.previewMedia}
                contentFit="cover"
                nativeControls
              />
            )}
          </View>
        </View>

        <View style={[chrome.glassCardSoft, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={chrome.eyebrow}>Tags</Text>
              <Text style={styles.cardTitle}>{editingTagId ? "Update clothing" : "Add clothing"}</Text>
            </View>
            <Text style={styles.sectionCount}>
              {tags.length} {tags.length === 1 ? "tag" : "tags"}
            </Text>
          </View>

          <Text style={styles.sectionCopy}>
            Keep the outfit links clean. The post can only publish once at least one tag is saved.
          </Text>

          <Text style={chrome.label}>Clothing name</Text>
          <TextInput
            style={chrome.input}
            value={tagName}
            onChangeText={setTagName}
            placeholder="White sneakers"
            placeholderTextColor={theme.color.inkSoft}
          />

          <Text style={[chrome.label, styles.inputLabel]}>Category</Text>
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

          <Text style={[chrome.label, styles.inputLabel]}>Brand</Text>
          <TextInput
            style={chrome.input}
            value={tagBrand}
            onChangeText={setTagBrand}
            placeholder="Optional"
            placeholderTextColor={theme.color.inkSoft}
          />

          <Text style={[chrome.label, styles.inputLabel]}>
            {REQUIRE_TAG_URLS ? "URL" : "URL (optional)"}
          </Text>
          <TextInput
            style={chrome.input}
            value={tagUrl}
            onChangeText={setTagUrl}
            placeholder={REQUIRE_TAG_URLS ? "https://..." : "https://..."}
            placeholderTextColor={theme.color.inkSoft}
            autoCapitalize="none"
          />
          <Text style={[chrome.helperText, styles.urlHelper]}>
            {REQUIRE_TAG_URLS
              ? "Use a safe http:// or https:// link."
              : "Leave empty to save a non-clickable tag, or add a safe http:// / https:// link."}
          </Text>

          <View style={styles.tagFormActions}>
            <Pressable
              onPress={() => void saveTag()}
              disabled={isSavingTag}
              style={[chrome.primaryButton, styles.tagActionButton, isSavingTag ? styles.disabled : undefined]}
            >
              <Text style={chrome.primaryButtonText}>
                {isSavingTag ? "Saving..." : editingTagId ? "Save tag" : "Add tag"}
              </Text>
            </Pressable>

            {editingTagId ? (
              <Pressable onPress={resetTagForm} style={[chrome.secondaryButton, styles.tagActionButton]}>
                <Text style={chrome.secondaryButtonText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>

          {tags.length === 0 ? (
            <View style={styles.emptyTagState}>
              <Text style={styles.emptyTagTitle}>No tags saved yet</Text>
              <Text style={styles.emptyTagCopy}>Save at least one clothing tag to unlock publish.</Text>
            </View>
          ) : (
            <View style={styles.tagList}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tagRow}>
                  <View style={styles.tagBody}>
                    <Text style={styles.tagName}>{tag.name}</Text>
                    <Text style={styles.tagMeta}>{tag.category || "other"}</Text>
                    <Text style={styles.tagMeta}>{tag.brand || "No brand"}</Text>
                    <Text numberOfLines={1} style={styles.tagMeta}>
                      {tag.url || "No outbound link"}
                    </Text>
                  </View>

                  <View style={styles.tagActions}>
                    <Pressable onPress={() => startEdit(tag)} style={styles.tagMiniButton}>
                      <Text style={styles.tagMiniButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void deleteTag(tag.id)}
                      style={[styles.tagMiniButton, styles.tagMiniButtonDanger]}
                    >
                      <Text style={styles.tagMiniButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {statusMessage ? (
          <View style={[chrome.glassCardSoft, styles.feedbackCard]}>
            <Text style={styles.feedbackText}>{statusMessage}</Text>
          </View>
        ) : null}

        {post.status === "published" ? (
          <View style={[chrome.glassCardSoft, styles.feedbackCard]}>
            <Text style={styles.feedbackText}>This post is live. You can head back to the feed now.</Text>
            <Link href="/(app)" style={styles.feedLink}>
              Back to feed
            </Link>
          </View>
        ) : null}
      </ScrollView>

      {post.status === "draft" ? (
        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
          <Pressable
            onPress={() => void publishDraft()}
            disabled={isPublishing}
            style={[chrome.primaryButton, styles.publishButton, isPublishing ? styles.disabled : undefined]}
          >
            <Text style={chrome.primaryButtonText}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 4,
  },
  categoryButton: {
    backgroundColor: "rgba(203, 180, 154, 0.18)",
    borderColor: "rgba(203, 180, 154, 0.30)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  categoryButtonActive: {
    backgroundColor: theme.color.accentBright,
    borderColor: theme.color.accentBright,
  },
  categoryText: {
    color: theme.color.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryTextActive: {
    color: theme.color.white,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  disabled: {
    opacity: 0.6,
  },
  emptyTagCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyTagState: {
    backgroundColor: "rgba(255,249,243,0.58)",
    borderColor: "rgba(216,206,194,0.72)",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  emptyTagTitle: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  feedbackCard: {
    marginTop: 14,
    padding: 16,
  },
  feedbackText: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  feedLink: {
    color: theme.color.accentBright,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  footerBar: {
    backgroundColor: "rgba(247,241,234,0.96)",
    borderTopColor: "rgba(216,206,194,0.72)",
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 12,
    position: "absolute",
    right: 0,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  inputLabel: {
    marginTop: 14,
  },
  loaderWrap: {
    alignItems: "center",
    backgroundColor: theme.color.shell,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  metaText: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 4,
  },
  missingCopy: {
    color: theme.color.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  previewMedia: {
    borderRadius: 24,
    height: "100%",
    width: "100%",
  },
  previewWrap: {
    backgroundColor: "rgba(245,238,231,0.76)",
    borderColor: "rgba(216,206,194,0.72)",
    borderRadius: 24,
    borderWidth: 1,
    height: 280,
    marginTop: 16,
    overflow: "hidden",
  },
  progressCard: {
    padding: 16,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
  },
  publishButton: {
    width: "100%",
  },
  screen: {
    backgroundColor: theme.color.shell,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  sectionCard: {
    marginTop: 14,
    padding: 16,
  },
  sectionCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  sectionCount: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tagActionButton: {
    flex: 1,
  },
  tagActions: {
    gap: 8,
    justifyContent: "center",
    marginLeft: 10,
  },
  tagBody: {
    flex: 1,
  },
  tagFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  tagList: {
    marginTop: 8,
  },
  tagMeta: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginTop: 3,
  },
  tagMiniButton: {
    alignItems: "center",
    backgroundColor: "rgba(203, 180, 154, 0.54)",
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagMiniButtonDanger: {
    backgroundColor: "rgba(184,64,54,0.86)",
    borderColor: "rgba(184,64,54,0.96)",
  },
  tagMiniButtonText: {
    color: theme.color.white,
    fontSize: 12,
    fontWeight: "700",
  },
  tagName: {
    color: theme.color.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  tagRow: {
    backgroundColor: "rgba(255,249,243,0.76)",
    borderColor: "rgba(216,206,194,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 10,
    padding: 12,
  },
  urlHelper: {
    marginTop: 8,
  },
});
