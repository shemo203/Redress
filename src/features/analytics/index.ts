import { supabase } from "../../lib/supabaseClient";
import { validateClothingTagUrl } from "../../utils";

type OutboundClickInput = {
  postId: string;
  tagId: string;
  url: string;
  userId: string;
};

type AppOpenInput = {
  userId: string;
};

type PostAnalyticsInput = {
  postId: string;
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
const analyticsSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const appOpenUsersLogged = new Set<string>();
const seenPostImpressions = new Set<string>();
const seenTagReveals = new Set<string>();

function pushDebugEntry(entry: OutboundClickDebugEntry) {
  recentOutboundClicks.unshift(entry);
  if (recentOutboundClicks.length > 20) {
    recentOutboundClicks.length = 20;
  }
}

export function getRecentOutboundClickDebugEntries() {
  return recentOutboundClicks;
}

export function getAnalyticsSessionId() {
  return analyticsSessionId;
}

function buildEventKey({ postId, userId }: PostAnalyticsInput) {
  return `${analyticsSessionId}:${userId}:${postId}`;
}

async function insertAnalyticsEventBestEffort(
  tableName: "app_opens" | "post_impressions" | "tag_reveals",
  payload:
    | { session_id: string; user_id: string }
    | { post_id: string; session_id: string; user_id: string }
) {
  const { error } = await supabase.from(tableName).insert(payload);
  return {
    error: error?.message ?? null,
    logged: !error,
    sessionId: analyticsSessionId,
  };
}

export async function logAppOpenBestEffort({ userId }: AppOpenInput) {
  if (appOpenUsersLogged.has(userId)) {
    return {
      error: null,
      logged: false,
      sessionId: analyticsSessionId,
    };
  }

  appOpenUsersLogged.add(userId);
  const result = await insertAnalyticsEventBestEffort("app_opens", {
    session_id: analyticsSessionId,
    user_id: userId,
  });

  if (result.error) {
    appOpenUsersLogged.delete(userId);
  }

  return result;
}

export async function logPostImpressionBestEffort({
  postId,
  userId,
}: PostAnalyticsInput) {
  const eventKey = buildEventKey({ postId, userId });
  if (seenPostImpressions.has(eventKey)) {
    return {
      error: null,
      logged: false,
      sessionId: analyticsSessionId,
    };
  }

  seenPostImpressions.add(eventKey);
  const result = await insertAnalyticsEventBestEffort("post_impressions", {
    post_id: postId,
    session_id: analyticsSessionId,
    user_id: userId,
  });

  if (result.error) {
    seenPostImpressions.delete(eventKey);
  }

  return result;
}

export async function logTagRevealBestEffort({
  postId,
  userId,
}: PostAnalyticsInput) {
  const eventKey = buildEventKey({ postId, userId });
  if (seenTagReveals.has(eventKey)) {
    return {
      error: null,
      logged: false,
      sessionId: analyticsSessionId,
    };
  }

  seenTagReveals.add(eventKey);
  const result = await insertAnalyticsEventBestEffort("tag_reveals", {
    post_id: postId,
    session_id: analyticsSessionId,
    user_id: userId,
  });

  if (result.error) {
    seenTagReveals.delete(eventKey);
  }

  return result;
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
  const validation = validateClothingTagUrl(url, { requireUrl: false });
  if (!validation.present) {
    return {
      error: "Tag has no outbound URL.",
      logged: false,
      normalizedUrl: null,
    };
  }
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
