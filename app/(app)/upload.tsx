import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  REQUIRE_TAG_URLS,
  TAG_CATEGORY_OPTIONS,
  type TagCategory,
  theme,
} from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import {
  CreatePostPreviewModal,
  createId,
  createImagePostPickerOptions,
  formatBytes,
  getPublishFailureMessage,
  inferExtension,
  type MediaType,
  type PendingTag,
  type PickedMedia,
  type SubmitMode,
  type SubmitResult,
  TagCard,
} from "../../src/features/createPost";
import { supabase } from "../../src/lib/supabaseClient";
import { GlassButton, GlassCard } from "../../src/ui";
import { validateClothingTagUrl } from "../../src/utils";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const tagComposerScrollRef = useRef<ScrollView | null>(null);

  const [caption, setCaption] = useState("");
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null);
  const [tags, setTags] = useState<PendingTag[]>([]);
  const [tagName, setTagName] = useState("");
  const [tagCategory, setTagCategory] = useState<TagCategory>("other");
  const [tagBrand, setTagBrand] = useState("");
  const [tagUrl, setTagUrl] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [isTagModalVisible, setIsTagModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<SubmitMode | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const previewPlayer = useVideoPlayer(
    pickedMedia?.mediaType === "video" ? pickedMedia.uri : null,
    (player) => {
      player.loop = true;
      player.muted = true;
    }
  );

  const resetTagForm = () => {
    setEditingTagId(null);
    setTagName("");
    setTagCategory("other");
    setTagBrand("");
    setTagUrl("");
  };

  const closeTagComposer = () => {
    Keyboard.dismiss();
    setIsTagModalVisible(false);
    resetTagForm();
  };

  const resetComposer = () => {
    setCaption("");
    setIsPreviewVisible(false);
    setPickedMedia(null);
    setTags([]);
    closeTagComposer();
  };

  const openNewTagComposer = () => {
    resetTagForm();
    setStatusMessage(null);
    setIsTagModalVisible(true);
  };

  const openEditTagComposer = (tag: PendingTag) => {
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagCategory(tag.category);
    setTagBrand(tag.brand);
    setTagUrl(tag.url);
    setStatusMessage(null);
    setIsTagModalVisible(true);
  };

  const pickMedia = async (requestedMediaType: MediaType) => {
    setStatusMessage(null);
    setSubmitResult(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage("Media library permission is required to pick a photo or video.");
      return;
    }

    const result =
      requestedMediaType === "image"
        ? await ImagePicker.launchImageLibraryAsync(createImagePostPickerOptions())
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            mediaTypes: ["videos"],
            quality: 1,
          });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset) {
      setStatusMessage("No photo or video selected.");
      return;
    }

    if (asset.type && asset.type !== "video" && asset.type !== "image") {
      setStatusMessage("Please select a photo or video.");
      return;
    }

    const mediaType: MediaType = asset.type === "image" ? "image" : "video";
    const maxBytes = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (asset.fileSize && asset.fileSize > maxBytes) {
      setStatusMessage(
        `Selected file is too large (${formatBytes(asset.fileSize)}). Please choose a smaller ${mediaType}.`
      );
      return;
    }
    setPickedMedia({
      fileName: asset.fileName ?? null,
      fileSize: asset.fileSize ?? null,
      mediaType,
      mimeType: asset.mimeType ?? null,
      uri: asset.uri,
    });
    setStatusMessage(
      mediaType === "image"
        ? "Photo cropped and ready. Add at least one item to publish."
        : "Video selected. Add at least one item to publish."
    );
  };

  const openMediaPicker = () => {
    Alert.alert("Choose media", "Photos can be cropped before upload.", [
      {
        text: "Photo",
        onPress: () => {
          void pickMedia("image");
        },
      },
      {
        text: "Video",
        onPress: () => {
          void pickMedia("video");
        },
      },
      {
        style: "cancel",
        text: "Cancel",
      },
    ]);
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

    setStatusMessage(editingTagId ? "Item updated." : "Item added.");
    closeTagComposer();
  };

  const removeTag = (tagId: string) => {
    setTags((currentTags) => currentTags.filter((tag) => tag.id !== tagId));
    if (editingTagId === tagId) {
      closeTagComposer();
    }
    setStatusMessage("Item removed.");
  };

  const submitPost = async (mode: SubmitMode) => {
    if (!user) {
      setStatusMessage("You must be signed in.");
      return;
    }

    if (!pickedMedia) {
      setStatusMessage("Pick a photo or video first.");
      return;
    }

    if (isTagModalVisible) {
      setStatusMessage("Finish the item editor first.");
      return;
    }

    if (mode === "published" && tags.length === 0) {
      setStatusMessage("Add at least one tag before publishing. You can still save a draft without tags.");
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
    const extension = inferExtension(pickedMedia);
    const filePath = `${user.id}/${postId}/${Date.now()}.${extension}`;

    try {
      const response = await fetch(pickedMedia.uri);
      if (!response.ok) {
        throw new Error("Unable to read selected media.");
      }

      const mediaBytes = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(filePath, mediaBytes, {
          contentType: pickedMedia.mimeType ?? `${pickedMedia.mediaType}/${extension}`,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("media").getPublicUrl(filePath);

      const { data: insertedPost, error: insertError } = await supabase
        .from("video_posts")
        .insert({
          caption: caption.trim(),
          creator_id: user.id,
          id: postId,
          media_type: pickedMedia.mediaType,
          status: "draft",
          video_url: publicUrl,
        })
        .select("id")
        .single();

      if (insertError) {
        await supabase.storage.from("media").remove([filePath]);
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
            message: `Draft saved, but items failed to save: ${tagInsertError.message}`,
            postId: insertedPost.id,
            status: "draft",
          });
          resetComposer();
          return;
        }
      }

      if (mode === "published") {
        Sentry.addBreadcrumb({
          category: "creator",
          data: {
            hasCaption: caption.trim().length > 0,
            mediaType: pickedMedia.mediaType,
            tagCount: normalizedTags.length,
          },
          level: "info",
          message: "Publish attempted",
          type: "user",
        });

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
            ? "Look published. It is now live in the feed."
            : "Draft saved. You can come back and finish it any time.",
        postId: insertedPost.id,
        status: mode,
      });
      resetComposer();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected upload error.";
      setStatusMessage(message);
    } finally {
      setSubmitMode(null);
    }
  };

  const canSaveDraft = Boolean(pickedMedia) && submitMode === null && !isTagModalVisible;
  const canPublish =
    Boolean(pickedMedia) && tags.length > 0 && submitMode === null && !isTagModalVisible;
  const canPreview = Boolean(pickedMedia) && !isTagModalVisible;
  const publishHint = !pickedMedia
    ? "Choose a photo or video to start"
    : tags.length === 0
      ? "Tag at least one item to publish"
      : "Ready to publish";
  const previewItems = tags.map((tag) => ({
    id: tag.id,
    label: tag.brand.trim() ? `${tag.name} · ${tag.brand.trim()}` : tag.name,
  }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 92, 120),
            paddingTop: Math.max(insets.top + 10, 18),
          },
        ]}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.headerTitle}>
            Create Post
          </Text>
          <GlassButton
            disabled={!canSaveDraft}
            minHeight={36}
            onPress={() => void submitPost("draft")}
            style={styles.saveDraftButton}
            textStyle={styles.saveDraftButtonText}
            variant="soft"
          >
            {submitMode === "draft" ? "Saving..." : "Save draft"}
          </GlassButton>
        </View>

        <GlassCard onPress={openMediaPicker} style={styles.previewCard}>
          {pickedMedia ? (
            <>
              {pickedMedia.mediaType === "image" ? (
                <Image resizeMode="cover" source={{ uri: pickedMedia.uri }} style={styles.previewMedia} />
              ) : (
                <VideoView
                  contentFit="cover"
                  nativeControls={false}
                  player={previewPlayer}
                  style={styles.previewMedia}
                />
              )}

              <View style={styles.previewMetaRow}>
                <Text numberOfLines={1} style={styles.previewMetaText}>
                  {pickedMedia.fileName ?? (pickedMedia.mediaType === "image" ? "Photo" : "Video")}
                </Text>
                <Text style={styles.previewMetaPill}>
                  {pickedMedia.fileSize ? formatBytes(pickedMedia.fileSize) : "Media ready"}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.previewEmptyState}>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgePlus}>+</Text>
              </View>
              <Text style={styles.previewEmptyTitle}>Choose your cover media</Text>
              <Text style={styles.previewEmptyCopy}>
                Pick a photo or video. Photos open a quick crop step before upload.
              </Text>
            </View>
          )}
        </GlassCard>

        {pickedMedia ? (
          <View style={styles.previewActionsRow}>
            <GlassButton
              disabled={!canPreview}
              minHeight={42}
              onPress={() => setIsPreviewVisible(true)}
              style={styles.previewActionButton}
              textStyle={styles.previewActionText}
              variant="soft"
            >
              Preview post
            </GlassButton>
            <GlassButton
              minHeight={42}
              onPress={openMediaPicker}
              style={styles.previewActionButton}
              textStyle={styles.previewActionText}
              variant="soft"
            >
              Replace media
            </GlassButton>
          </View>
        ) : null}

        <GlassCard style={styles.captionCard}>
          <View style={styles.captionHeader}>
            <Text style={styles.captionLabel}>Description</Text>
          </View>
          <TextInput
            multiline
            onChangeText={setCaption}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="Describe your look..."
            placeholderTextColor={theme.color.warmGold}
            returnKeyType="done"
            style={styles.captionInput}
            submitBehavior="blurAndSubmit"
            textAlignVertical="top"
            value={caption}
          />
        </GlassCard>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items</Text>

          {tags.length === 0 ? (
            <Text style={styles.emptyItemsCopy}>
              Add the first item now so the look can be published.
            </Text>
          ) : (
            <View style={styles.itemsWrap}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.itemCardWrap}>
                  <TagCard
                    onDelete={removeTag}
                    onEdit={openEditTagComposer}
                    tag={tag}
                  />
                </View>
              ))}
            </View>
          )}

          <GlassButton
            minHeight={44}
            onPress={openNewTagComposer}
            style={styles.addItemButton}
            textStyle={styles.addItemButtonText}
            variant="soft"
          >
            <Text style={styles.addItemInnerText}>＋</Text>
            <Text style={styles.addItemInnerLabel}>Add item</Text>
          </GlassButton>

          <View style={styles.publishSection}>
            <Text style={styles.publishHint}>{publishHint}</Text>
            <GlassButton
              disabled={!canPublish}
              minHeight={50}
              onPress={() => void submitPost("published")}
              style={styles.publishButton}
            >
              {submitMode === "published" ? "Publishing..." : "Publish Look"}
            </GlassButton>
          </View>
        </View>

        {statusMessage ? (
          <GlassCard style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{statusMessage}</Text>
          </GlassCard>
        ) : null}

        {submitResult ? (
          <GlassCard style={styles.feedbackCard}>
            <Text style={styles.resultTitle}>
              {submitResult.status === "published" ? "Look published" : "Draft saved"}
            </Text>
            <Text style={styles.feedbackText}>{submitResult.message}</Text>
            {submitResult.status === "published" ? (
              <Link href="/(app)" style={styles.resultLink}>
                Go to feed
              </Link>
            ) : (
              <Link href={`/(app)/draft/${submitResult.postId}`} style={styles.resultLink}>
                Open draft editor
              </Link>
            )}
          </GlassCard>
        ) : null}
      </ScrollView>

      <CreatePostPreviewModal
        caption={caption}
        items={previewItems}
        media={pickedMedia ? { mediaType: pickedMedia.mediaType, uri: pickedMedia.uri } : null}
        onClose={() => setIsPreviewVisible(false)}
        visible={isPreviewVisible}
      />

      <Modal
        animationType="fade"
        transparent
        visible={isTagModalVisible}
        onRequestClose={closeTagComposer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalKeyboardRoot}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeTagComposer}>
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={[
                styles.modalPanel,
                { paddingBottom: Math.max(insets.bottom + 16, 24) },
              ]}
            >
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>
                {editingTagId ? "Edit item" : "Add item"}
              </Text>
              <Text style={styles.modalCopy}>
                Keep it simple: name, brand, category, and an optional safe link.
              </Text>

              <ScrollView
                ref={tagComposerScrollRef}
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={styles.modalContent}
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                showsVerticalScrollIndicator={false}
              >
              <GlassCard style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  onChangeText={setTagName}
                  placeholder="Bag"
                  placeholderTextColor={theme.color.warmGold}
                  style={styles.fieldInput}
                  value={tagName}
                />
              </GlassCard>

              <GlassCard style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Brand</Text>
                <TextInput
                  onChangeText={setTagBrand}
                  placeholder="Cult Gaia"
                  placeholderTextColor={theme.color.warmGold}
                  style={styles.fieldInput}
                  value={tagBrand}
                />
              </GlassCard>

              <GlassCard style={styles.fieldCard}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryWrap}>
                  {TAG_CATEGORY_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setTagCategory(option)}
                      style={({ pressed }) => [
                        styles.categoryButton,
                        tagCategory === option ? styles.categoryButtonActive : undefined,
                        pressed ? styles.pressed : undefined,
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
              </GlassCard>

              <GlassCard style={styles.fieldCard}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>
                    {REQUIRE_TAG_URLS ? "Link" : "Link (optional)"}
                  </Text>
                </View>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={setTagUrl}
                  onFocus={() => {
                    requestAnimationFrame(() => {
                      tagComposerScrollRef.current?.scrollToEnd({ animated: true });
                    });
                  }}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="https://..."
                  placeholderTextColor={theme.color.warmGold}
                  returnKeyType="done"
                  style={styles.fieldInput}
                  value={tagUrl}
                />
                <Text style={styles.fieldHint}>
                  {REQUIRE_TAG_URLS
                    ? "Only safe http:// or https:// links are allowed."
                    : "Leave empty to keep the tag non-clickable."}
                </Text>
              </GlassCard>
              </ScrollView>

              <View style={styles.modalActions}>
                <GlassButton
                  minHeight={44}
                  onPress={closeTagComposer}
                  style={styles.modalAction}
                  textStyle={styles.modalSecondaryText}
                  variant="soft"
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  minHeight={44}
                  onPress={saveTag}
                  style={styles.modalAction}
                  variant="cream"
                >
                  {editingTagId ? "Save item" : "Add item"}
                </GlassButton>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addItemButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 15,
  },
  addItemButtonText: {
    color: theme.color.sepia,
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "600",
  },
  addItemInnerLabel: {
    color: theme.color.sepia,
    fontSize: 14,
    fontWeight: "500",
  },
  addItemInnerText: {
    color: theme.color.sepia,
    fontSize: 18,
    fontWeight: "300",
    marginTop: -2,
  },
  captionCard: {
    marginTop: 14,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  captionHeader: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  captionInput: {
    color: theme.color.sepia,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 58,
    padding: 0,
  },
  captionLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  categoryButton: {
    backgroundColor: "rgba(255,249,243,0.78)",
    borderColor: "rgba(216,206,194,0.84)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  categoryButtonActive: {
    backgroundColor: "rgba(208,156,128,0.18)",
    borderColor: theme.color.warmBorder,
  },
  categoryText: {
    color: theme.color.inkSoft,
    fontSize: 11,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: theme.color.sepia,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  emptyItemsCopy: {
    color: theme.color.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  feedbackCard: {
    marginTop: 14,
    padding: 16,
  },
  feedbackText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 19,
  },
  fieldCard: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  fieldHint: {
    color: theme.color.muted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 6,
  },
  fieldInput: {
    color: theme.color.sepia,
    fontSize: 15,
    marginTop: 5,
    minHeight: 22,
    padding: 0,
  },
  fieldLabel: {
    color: theme.color.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  headerTitle: {
    color: theme.color.sepia,
    flex: 1,
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "700",
    paddingRight: 8,
    textAlign: "left",
  },
  itemCardWrap: {
    width: "48.4%",
  },
  itemsSection: {
    marginTop: 18,
  },
  itemsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 7,
  },
  modalAction: {
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalBackdrop: {
    backgroundColor: "rgba(20,14,11,0.24)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    paddingTop: 6,
  },
  modalCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(209,188,164,0.9)",
    borderRadius: 999,
    height: 5,
    marginBottom: 8,
    width: 58,
  },
  modalKeyboardRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalPanel: {
    backgroundColor: theme.color.shell,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  modalSecondaryText: {
    color: theme.color.ink,
    fontFamily: "System",
    fontSize: 14,
    fontWeight: "600",
  },
  modalTitle: {
    color: theme.color.sepia,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  previewBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,244,0.56)",
    borderRadius: 999,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  previewBadgePlus: {
    color: theme.color.sepia,
    fontSize: 30,
    fontWeight: "300",
    marginTop: -4,
  },
  previewCard: {
    minHeight: 280,
    overflow: "hidden",
    padding: 0,
  },
  previewActionButton: {
    flex: 1,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  previewActionText: {
    color: theme.color.sepia,
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "700",
  },
  previewEmptyCopy: {
    color: theme.color.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 220,
    textAlign: "center",
  },
  previewEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    paddingHorizontal: 24,
  },
  previewEmptyTitle: {
    color: theme.color.sepia,
    fontFamily: "serif",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },
  previewMedia: {
    height: 280,
    width: "100%",
  },
  previewMetaPill: {
    backgroundColor: "rgba(255,250,244,0.78)",
    borderColor: "rgba(255,255,255,0.55)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    color: theme.color.sepia,
    fontSize: 10.5,
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  previewMetaRow: {
    alignItems: "center",
    backgroundColor: "rgba(247, 241, 232, 0.78)",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: "absolute",
    right: 0,
  },
  previewMetaText: {
    color: theme.color.sepia,
    flex: 1,
    fontSize: 11.5,
    fontWeight: "500",
    marginRight: 10,
  },
  publishButton: {
    width: "100%",
  },
  publishHint: {
    color: theme.color.muted,
    fontSize: 12.5,
    textAlign: "center",
  },
  publishSection: {
    marginTop: 24,
  },
  resultLink: {
    color: theme.color.sepia,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  resultTitle: {
    color: theme.color.sepia,
    fontFamily: "serif",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  saveDraftButton: {
    minWidth: 82,
    paddingHorizontal: 12,
    shadowOpacity: 0.1,
  },
  saveDraftButtonText: {
    color: theme.color.ink,
    fontFamily: "System",
    fontSize: 13,
    fontWeight: "500",
  },
  screen: {
    backgroundColor: theme.color.cream,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: theme.color.sepia,
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "700",
  },
});
