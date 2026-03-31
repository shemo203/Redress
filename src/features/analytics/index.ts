import { supabase } from "../../lib/supabaseClient";
import { validateClothingTagUrl } from "../../utils";

type OutboundClickInput = {
  postId: string;
  tagId: string;
  url: string;
  userId: string;
};

export type OutboundClickDebugEntry = {
  createdAt: string;
  error: string | null;
  postId: string;
  tagId: string;
  url: string;
  userId: string;
};

const outboundClickTapWindowMs = 1500;
const recentOutboundClicks: OutboundClickDebugEntry[] = [];
const outboundClickCooldownByTag = new Map<string, number>();

function pushDebugEntry(entry: OutboundClickDebugEntry) {
  recentOutboundClicks.unshift(entry);
  if (recentOutboundClicks.length > 20) {
    recentOutboundClicks.length = 20;
  }
}

export function getRecentOutboundClickDebugEntries() {
  return recentOutboundClicks;
}

export function shouldLogOutboundClick(tagId: string, now = Date.now()) {
  const cooldownUntil = outboundClickCooldownByTag.get(tagId) ?? 0;
  if (now < cooldownUntil) {
    return false;
  }

  outboundClickCooldownByTag.set(tagId, now + outboundClickTapWindowMs);
  return true;
}

export async function logOutboundClickBestEffort({
  postId,
  tagId,
  url,
  userId,
}: OutboundClickInput) {
  const validation = validateClothingTagUrl(url);
  if (!validation.valid) {
    return {
      error: validation.error,
      logged: false,
      normalizedUrl: null,
    };
  }

  const normalizedUrl = validation.normalized;

  const { error } = await supabase.from("outbound_clicks").insert({
    post_id: postId,
    tag_id: tagId,
    url: normalizedUrl,
    user_id: userId,
  });

  if (__DEV__) {
    pushDebugEntry({
      createdAt: new Date().toISOString(),
      error: error?.message ?? null,
      postId,
      tagId,
      url: normalizedUrl,
      userId,
    });
  }

  return {
    error: error?.message ?? null,
    logged: !error,
    normalizedUrl,
  };
}
