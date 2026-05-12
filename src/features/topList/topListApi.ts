import { supabase } from "../../lib/supabaseClient";
import { getErrorMessage, isNetworkErrorMessage } from "../../utils/errors";
import type { TopListEntry, TopListPeriod } from "./topListTypes";

type TopListRpcRow = {
  avatar_url: string | null;
  avg_grade: number | string;
  caption: string | null;
  creator_id: string;
  grade_count: number | string;
  item_count: number | string;
  media_type: "image" | "video";
  post_id: string;
  published_at: string;
  rank: number | string;
  username: string;
  video_url: string;
};

function toTopListMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("get_top_posts") ||
    normalized.includes("get_my_best_ranked_post") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the function public.get_top_posts") ||
    normalized.includes("could not find the function public.get_my_best_ranked_post")
  ) {
    return "Top List needs the latest database migration. Run `supabase db push`, then reload the app.";
  }

  if (normalized.includes("auth_required") || normalized.includes("not authorized")) {
    return "Sign in is required to view the Top List.";
  }

  if (isNetworkErrorMessage(message)) {
    return "Could not reach the server. Check connection and try again.";
  }

  return message;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeEntry(row: TopListRpcRow): TopListEntry {
  return {
    avatarUrl: row.avatar_url,
    avgGrade: toNumber(row.avg_grade),
    caption: row.caption?.trim() ?? "",
    creatorId: row.creator_id,
    gradeCount: toNumber(row.grade_count),
    itemCount: toNumber(row.item_count),
    mediaType: row.media_type,
    postId: row.post_id,
    publishedAt: row.published_at,
    rank: toNumber(row.rank),
    username: row.username,
    videoUrl: row.video_url,
  };
}

export async function fetchTopPosts(period: TopListPeriod, limit = 8) {
  try {
    const { data, error } = await supabase.rpc("get_top_posts", {
      page_limit: limit,
      period,
    });

    if (error) {
      return {
        data: [] as TopListEntry[],
        error: toTopListMessage(error, "Could not load the Top List."),
      };
    }

    return {
      data: ((data ?? []) as TopListRpcRow[]).map(normalizeEntry),
      error: null,
    };
  } catch (error) {
    return {
      data: [] as TopListEntry[],
      error: toTopListMessage(error, "Could not load the Top List."),
    };
  }
}

export async function fetchMyBestRankedPost(period: TopListPeriod) {
  try {
    const { data, error } = await supabase.rpc("get_my_best_ranked_post", {
      period,
    });

    if (error) {
      return {
        data: null as TopListEntry | null,
        error: toTopListMessage(error, "Could not load your Top List stats."),
      };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: row ? normalizeEntry(row as TopListRpcRow) : null,
      error: null,
    };
  } catch (error) {
    return {
      data: null as TopListEntry | null,
      error: toTopListMessage(error, "Could not load your Top List stats."),
    };
  }
}

export async function fetchHasPublishedFits(userId: string) {
  if (!userId.trim()) {
    return {
      data: false,
      error: null,
    };
  }

  try {
    const { count, error } = await supabase
      .from("video_posts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "published");

    if (error) {
      return {
        data: false,
        error: toTopListMessage(error, "Could not load your fits."),
      };
    }

    return {
      data: (count ?? 0) > 0,
      error: null,
    };
  } catch (error) {
    return {
      data: false,
      error: toTopListMessage(error, "Could not load your fits."),
    };
  }
}
