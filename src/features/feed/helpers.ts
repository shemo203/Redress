import type { SocialComment } from "../social";
import { getOutboundLinkPolicy } from "../links";
import type { FeedTag } from "./types";
import { validateClothingTagUrl } from "../../utils";

export function getTagLinkSummary(tag: FeedTag) {
  const validation = validateClothingTagUrl(tag.url, {
    requireUrl: false,
  });

  if (!validation.present) {
    return {
      blocked: false,
      canPreview: false,
      detail: "No shopping link added",
      reason: "This tag does not have an outbound link yet.",
    };
  }

  if (!validation.valid) {
    return {
      blocked: true,
      canPreview: false,
      detail: "Unsafe link blocked",
      reason: "Only valid http:// or https:// links can be previewed.",
    };
  }

  const policy = getOutboundLinkPolicy(validation.normalized);
  if (!policy.allowed) {
    return {
      blocked: true,
      canPreview: false,
      detail: "Blocked destination",
      reason: policy.reason ?? "This destination is blocked.",
    };
  }

  try {
    const hostname = new URL(validation.normalized).hostname.replace(/^www\./, "");
    return {
      blocked: false,
      canPreview: true,
      detail: hostname || "Preview link",
      reason: null,
    };
  } catch {
    return {
      blocked: false,
      canPreview: true,
      detail: "Preview link",
      reason: null,
    };
  }
}

export function getCaptionPreview(caption: string) {
  const fallback = "Fresh fit, no caption yet.";
  const source = caption.trim().length > 0 ? caption.trim() : fallback;

  if (source.length <= 88) {
    return {
      text: source,
      truncated: false,
    };
  }

  return {
    text: `${source.slice(0, 88).trimEnd()}…`,
    truncated: true,
  };
}

export function formatCommentTime(dateString: string) {
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

export function sortCommentsOldestFirst(comments: SocialComment[]) {
  return [...comments].sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}
