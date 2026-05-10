import { supabase } from "../../lib/supabaseClient";
import { getErrorMessage, isNetworkErrorMessage } from "../../utils/errors";

export type DeleteablePost = {
  caption: string;
  created_at: string;
  creator_id: string;
  id: string;
  media_type: "image" | "video";
  published_at: string | null;
  status: "draft" | "published";
  updated_at: string;
  video_url: string;
};

type StorageTarget = {
  bucket: string;
  path: string;
};

function toDeletePostMessage(error: unknown) {
  const message = getErrorMessage(error, "Could not delete post.");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("auth_required") ||
    normalized.includes("not_post_owner") ||
    normalized.includes("permission")
  ) {
    return "You can only delete your own posts.";
  }

  if (normalized.includes("post_not_found")) {
    return "This post was already removed.";
  }

  if (isNetworkErrorMessage(message)) {
    return "Could not reach the server. Check connection and try again.";
  }

  return message;
}

function parsePublicStorageTarget(assetUrl: string | null): StorageTarget | null {
  if (!assetUrl) {
    return null;
  }

  try {
    const parsed = new URL(assetUrl);
    const publicPrefix = "/storage/v1/object/public/";
    const publicIndex = parsed.pathname.indexOf(publicPrefix);

    if (publicIndex < 0) {
      return null;
    }

    const remainder = parsed.pathname.slice(publicIndex + publicPrefix.length);
    const [bucket, ...pathParts] = remainder.split("/").filter(Boolean);

    if (!bucket || pathParts.length === 0) {
      return null;
    }

    return {
      bucket,
      path: decodeURIComponent(pathParts.join("/")),
    };
  } catch {
    return null;
  }
}

export async function deleteOwnPost(postId: string) {
  if (!postId.trim()) {
    return {
      data: null,
      error: "Missing post id.",
      storageWarning: null,
    };
  }

  const { data, error } = await supabase.rpc("delete_own_post", {
    post_id: postId,
  });

  if (error) {
    return {
      data: null,
      error: toDeletePostMessage(error),
      storageWarning: null,
    };
  }

  const deletedPost = (Array.isArray(data) ? data[0] ?? null : data ?? null) as DeleteablePost | null;

  if (!deletedPost) {
    return {
      data: null,
      error: "Post deletion did not complete.",
      storageWarning: null,
    };
  }

  const storageTarget = parsePublicStorageTarget(deletedPost.video_url);
  let storageWarning: string | null = null;

  if (storageTarget) {
    const { error: removeError } = await supabase.storage
      .from(storageTarget.bucket)
      .remove([storageTarget.path]);

    if (removeError) {
      storageWarning = "Post deleted, but media cleanup failed.";
      if (__DEV__) {
        console.error("Failed to remove post media", removeError);
      }
    }
  }

  return {
    data: deletedPost,
    error: null,
    storageWarning,
  };
}
