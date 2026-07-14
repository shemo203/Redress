import { VideoView, useVideoPlayer } from "expo-video";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../../constants";
import { GlassButton } from "../../ui";
import { CREATE_POST_MEDIA_ASPECT_RATIO } from "./layout";

type PreviewItem = {
  id: string;
  label: string;
};

type PreviewMedia = {
  mediaType: "image" | "video";
  uri: string;
};

type CreatePostPreviewModalProps = {
  caption: string;
  items: PreviewItem[];
  media: PreviewMedia | null;
  onClose: () => void;
  visible: boolean;
};

export function CreatePostPreviewModal({
  caption,
  items,
  media,
  onClose,
  visible,
}: CreatePostPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(media?.mediaType === "video" ? media.uri : null, (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
  });

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.safeFrame,
            {
              paddingBottom: Math.max(insets.bottom + 20, 28),
              paddingTop: Math.max(insets.top + 14, 22),
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Close</Text>
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>Create Post</Text>
              <Text style={styles.title}>Preview</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.postShell}>
            <View style={styles.mediaShell}>
              {media ? (
                media.mediaType === "image" ? (
                  <Image resizeMode="contain" source={{ uri: media.uri }} style={styles.previewMedia} />
                ) : (
                  <VideoView
                    contentFit="contain"
                    nativeControls={false}
                    player={player}
                    style={styles.previewMedia}
                  />
                )
              ) : (
                <View style={styles.mediaFallback}>
                  <Text style={styles.mediaFallbackText}>Choose media to preview your post.</Text>
                </View>
              )}
            </View>

            <ScrollView
              contentContainerStyle={styles.postMeta}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.metaLabel}>Description</Text>
              <Text style={styles.captionText}>
                {caption.trim() ? caption.trim() : "No description yet."}
              </Text>

              <Text style={styles.metaLabel}>Clothing</Text>
              {items.length > 0 ? (
                <View style={styles.itemWrap}>
                  {items.map((item) => (
                    <View key={item.id} style={styles.itemPill}>
                      <Text numberOfLines={1} style={styles.itemPillText}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyItemsText}>No clothing added yet.</Text>
              )}
            </ScrollView>
          </View>

          <GlassButton minHeight={52} onPress={onClose} style={styles.footerButton}>
            Continue editing
          </GlassButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(20,14,11,0.94)",
    flex: 1,
  },
  captionText: {
    color: theme.color.white,
    fontSize: 16,
    lineHeight: 23,
  },
  emptyItemsText: {
    color: "rgba(255,250,246,0.7)",
    fontSize: 14,
    lineHeight: 20,
  },
  eyebrow: {
    color: "rgba(255,250,246,0.72)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  footerButton: {
    marginTop: 18,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerButton: {
    minWidth: 64,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: theme.color.white,
    fontSize: 15,
    fontWeight: "700",
  },
  headerSpacer: {
    minWidth: 64,
  },
  headerText: {
    alignItems: "center",
    flex: 1,
  },
  itemPill: {
    backgroundColor: "rgba(255,250,246,0.1)",
    borderColor: "rgba(255,250,246,0.14)",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemPillText: {
    color: theme.color.white,
    fontSize: 13,
    fontWeight: "700",
  },
  itemWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,246,0.08)",
    flex: 1,
    justifyContent: "center",
  },
  mediaFallbackText: {
    color: "rgba(255,250,246,0.72)",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  mediaShell: {
    backgroundColor: "rgba(8,6,5,0.92)",
    borderBottomWidth: 1,
    borderColor: "rgba(255,250,246,0.08)",
    aspectRatio: CREATE_POST_MEDIA_ASPECT_RATIO,
    overflow: "hidden",
    width: "100%",
  },
  metaLabel: {
    color: "rgba(255,250,246,0.72)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.35,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  postMeta: {
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  postShell: {
    backgroundColor: "rgba(34,24,19,0.96)",
    borderColor: "rgba(255,250,246,0.12)",
    borderRadius: 30,
    borderWidth: 1,
    flex: 1,
    marginTop: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
  },
  previewMedia: {
    height: "100%",
    width: "100%",
  },
  safeFrame: {
    flex: 1,
    paddingHorizontal: 18,
  },
  title: {
    color: theme.color.white,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
});
