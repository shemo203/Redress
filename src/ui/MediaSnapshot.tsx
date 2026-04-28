import { getThumbnailAsync } from "expo-video-thumbnails";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { theme } from "../constants";

type MediaSnapshotProps = {
  mediaType: "image" | "video";
  placeholderLabel?: string;
  showVideoBadge?: boolean;
  style?: StyleProp<ViewStyle>;
  uri: string | null;
};

const thumbnailCache = new Map<string, string | null>();
const pendingThumbnailRequests = new Map<string, Promise<string | null>>();

async function resolveThumbnailUri(uri: string) {
  const cached = thumbnailCache.get(uri);
  if (cached !== undefined) {
    return cached;
  }

  const pending = pendingThumbnailRequests.get(uri);
  if (pending) {
    return pending;
  }

  const request = getThumbnailAsync(uri, {
    quality: 0.72,
    time: 900,
  })
    .then((result) => {
      thumbnailCache.set(uri, result.uri);
      return result.uri;
    })
    .catch((error) => {
      if (__DEV__) {
        console.error("Failed to generate video thumbnail", error);
      }
      thumbnailCache.set(uri, null);
      return null;
    })
    .finally(() => {
      pendingThumbnailRequests.delete(uri);
    });

  pendingThumbnailRequests.set(uri, request);
  return request;
}

export function MediaSnapshot({
  mediaType,
  placeholderLabel = "No media",
  showVideoBadge = false,
  style,
  uri,
}: MediaSnapshotProps) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(() =>
    mediaType === "video" && uri ? thumbnailCache.get(uri) ?? null : null
  );
  const [isLoading, setIsLoading] = useState(
    mediaType === "video" && uri ? !thumbnailCache.has(uri) : false
  );

  useEffect(() => {
    let isActive = true;

    if (mediaType !== "video" || !uri) {
      setThumbnailUri(null);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    const videoUri = uri;
    const cached = thumbnailCache.get(videoUri);
    if (cached !== undefined) {
      setThumbnailUri(cached);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);

    void resolveThumbnailUri(videoUri).then((nextThumbnailUri) => {
      if (!isActive) {
        return;
      }
      setThumbnailUri(nextThumbnailUri);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [mediaType, uri]);

  const resolvedUri = mediaType === "image" ? uri : thumbnailUri;

  return (
    <View style={[styles.frame, style]}>
      {resolvedUri ? (
        <Image resizeMode="cover" source={{ uri: resolvedUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          {isLoading ? (
            <ActivityIndicator color={theme.color.accentBright} size="small" />
          ) : (
            <Text style={styles.placeholderText}>{placeholderLabel}</Text>
          )}
        </View>
      )}

      {showVideoBadge && mediaType === "video" ? (
        <View style={styles.videoBadge}>
          <Text style={styles.videoBadgeText}>▶</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "rgba(230,220,207,0.94)",
    overflow: "hidden",
  },
  image: {
    height: "100%",
    width: "100%",
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: "rgba(232,221,208,0.96)",
    flex: 1,
    justifyContent: "center",
  },
  placeholderText: {
    color: theme.color.inkSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  videoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,243,0.84)",
    borderColor: "rgba(216,206,194,0.92)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 8,
    height: 28,
    justifyContent: "center",
    left: 8,
    position: "absolute",
    width: 28,
  },
  videoBadgeText: {
    color: theme.color.inkSoft,
    fontSize: 12,
    marginLeft: 1,
  },
});
