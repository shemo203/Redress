import type { PendingTag, PickedMedia } from "./types";

export function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function inferExtension(media: PickedMedia) {
  const source = media.fileName ?? media.uri;
  const parts = source.split(".");
  const last = parts[parts.length - 1];

  if (!last || last.includes("/")) {
    return media.mediaType === "image" ? "jpg" : "mp4";
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

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? createUuidLike();
}

export function getPublishFailureMessage(errorMessage: string) {
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

export function getTagBadgeLabel(tag: PendingTag) {
  const primary = tag.brand.trim() || tag.category;
  return primary.length > 14 ? `${primary.slice(0, 13)}…` : primary;
}
