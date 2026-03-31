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

import { theme } from "../../src/constants";
import { useAuth } from "../../src/features/auth";
import { supabase } from "../../src/lib/supabaseClient";

const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

type PickedVideo = {
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uri: string;
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

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [caption, setCaption] = useState("");
  const [pickedVideo, setPickedVideo] = useState<PickedVideo | null>(null);
  const [draftPostId, setDraftPostId] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const previewPlayer = useVideoPlayer(uploadedVideoUrl ?? null, (player) => {
    player.loop = false;
  });

  const pickVideo = async () => {
    setStatusMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusMessage("Media library permission is required to pick a video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
      allowsEditing: false,
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

    setDraftPostId(null);
    setUploadedVideoUrl(null);
    setPickedVideo({
      fileName: asset.fileName ?? null,
      fileSize: asset.fileSize ?? null,
      mimeType: asset.mimeType ?? null,
      uri: asset.uri,
    });
    setStatusMessage("Video selected. Ready to upload.");
  };

  const uploadVideo = async () => {
    if (!user) {
      setStatusMessage("You must be signed in.");
      return;
    }
    if (!pickedVideo) {
      setStatusMessage("Pick a video first.");
      return;
    }

    setStatusMessage(null);
    setIsUploading(true);
    setDraftPostId(null);
    setUploadedVideoUrl(null);

    const postId = globalThis.crypto?.randomUUID?.() ?? createUuidLike();
    const extension = inferExtension(pickedVideo);
    const timestamp = Date.now();
    const filePath = `${user.id}/${postId}/${timestamp}.${extension}`;

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
          id: postId,
          caption: caption.trim(),
          creator_id: user.id,
          status: "draft",
          video_url: publicUrl,
        })
        .select("id, video_url")
        .single();

      if (insertError) {
        await supabase.storage.from("videos").remove([filePath]);
        throw new Error(`Draft post creation failed: ${insertError.message}`);
      }

      setDraftPostId(insertedPost.id);
      setUploadedVideoUrl(insertedPost.video_url);
      setStatusMessage("Upload complete. Draft post created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected upload error.";
      setStatusMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroGlow} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Post Your Fit</Text>
        <Pressable onPress={() => router.replace("/(app)")} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <Pressable onPress={pickVideo} style={styles.uploadPanel}>
        {uploadedVideoUrl ? (
          <VideoView
            player={previewPlayer}
            style={styles.panelPreview}
            contentFit="cover"
            nativeControls
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

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        onChangeText={setCaption}
        placeholder="Add a caption..."
        style={styles.input}
        value={caption}
      />

      {pickedVideo ? (
        <View style={styles.metaWrap}>
          <Text style={styles.meta}>Selected: {pickedVideo.fileName ?? "video"}</Text>
          <Text style={styles.meta}>URI: {pickedVideo.uri}</Text>
          <Text style={styles.meta}>
            File size:{" "}
            {pickedVideo.fileSize ? formatBytes(pickedVideo.fileSize) : "Unknown"}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={isUploading || !pickedVideo}
        onPress={uploadVideo}
        style={[
          styles.button,
          isUploading || !pickedVideo ? styles.disabledButton : styles.uploadButton,
        ]}
      >
        <Text style={styles.buttonText}>
          {isUploading ? "Uploading..." : "Upload and create draft"}
        </Text>
      </Pressable>

      {statusMessage ? <Text style={styles.status}>{statusMessage}</Text> : null}

      {draftPostId ? (
        <View style={styles.successWrap}>
          <Text style={styles.successTitle}>Draft created</Text>
          <Text style={styles.meta}>Post ID: {draftPostId}</Text>
          <Text style={styles.meta}>Video URL: {uploadedVideoUrl}</Text>
          <Link href={`/(app)/draft/${draftPostId}`} style={styles.linkText}>
            Open Draft Post
          </Link>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    marginTop: 12,
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
  closeButton: {
    alignItems: "center",
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
  },
  copy: {
    color: theme.color.muted,
    marginBottom: 8,
  },
  disabledButton: {
    backgroundColor: "#d8a8a2",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroGlow: {
    backgroundColor: "rgba(241, 226, 215, 0.7)",
    borderRadius: 260,
    height: 320,
    left: 90,
    position: "absolute",
    top: 90,
    width: 320,
  },
  input: {
    backgroundColor: "rgba(255,250,246,0.98)",
    borderColor: theme.color.border,
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
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
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
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
  },
  pickButton: {
    backgroundColor: "#8f7d70",
  },
  preview: {
    backgroundColor: "#000",
    borderRadius: 8,
    height: 240,
    marginTop: 14,
    width: "100%",
  },
  status: {
    color: theme.color.inkSoft,
    marginTop: 10,
  },
  successTitle: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  successWrap: {
    backgroundColor: "rgba(255,249,243,0.92)",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
  },
  uploadButton: {
    backgroundColor: theme.color.accentBright,
  },
  uploadBadge: {
    alignItems: "center",
    backgroundColor: "rgba(140,120,110,0.10)",
    borderRadius: 999,
    height: 92,
    justifyContent: "center",
    width: 92,
  },
  uploadBadgeArrow: {
    color: theme.color.inkSoft,
    fontSize: 40,
    fontWeight: "300",
    marginTop: -6,
  },
  uploadPanel: {
    alignItems: "center",
    backgroundColor: "rgba(245,238,231,0.94)",
    borderColor: theme.color.border,
    borderRadius: 34,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 520,
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
});
