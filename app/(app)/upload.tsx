import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";
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
      <Text style={styles.title}>Upload video</Text>
      <Text style={styles.copy}>
        Pick a video from your library. This creates a draft post.
      </Text>

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        onChangeText={setCaption}
        placeholder="Add a caption..."
        style={styles.input}
        value={caption}
      />

      <Pressable onPress={pickVideo} style={[styles.button, styles.pickButton]}>
        <Text style={styles.buttonText}>Pick video</Text>
      </Pressable>

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

      {uploadedVideoUrl ? (
        <VideoView
          player={previewPlayer}
          style={styles.preview}
          contentFit="contain"
          nativeControls
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    marginTop: 10,
    paddingVertical: 12,
    ...theme.shadow.card,
  },
  buttonText: {
    color: theme.color.white,
    fontWeight: "700",
  },
  container: {
    backgroundColor: theme.color.bg,
    flexGrow: 1,
    padding: 16,
  },
  copy: {
    color: theme.color.muted,
    marginBottom: 8,
  },
  disabledButton: {
    backgroundColor: "#cc9b95",
  },
  input: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.color.ink,
    padding: 12,
  },
  label: {
    color: theme.color.ink,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  linkText: {
    color: theme.color.accent,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  meta: {
    color: theme.color.ink,
    fontSize: 12,
  },
  metaWrap: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: 4,
    marginTop: 10,
    padding: 10,
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
    color: theme.color.ink,
    marginTop: 10,
  },
  successTitle: {
    color: theme.color.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  successWrap: {
    backgroundColor: theme.color.bgPanel,
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  title: {
    color: theme.color.ink,
    fontFamily: "serif",
    fontSize: 34,
    fontWeight: "700",
    marginBottom: 8,
  },
  uploadButton: {
    backgroundColor: theme.color.accent,
  },
});
