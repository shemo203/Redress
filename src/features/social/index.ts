import { supabase } from "../../lib/supabaseClient";

export const COMMENT_MAX_LENGTH = 500;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SocialProfile = {
  avatar_url: string | null;
  bio: string | null;
  id: string;
  username: string;
};

export type SocialPost = {
  caption: string;
  created_at: string;
  id: string;
  status: "draft" | "published";
  video_url: string;
};

export type FollowCounts = {
  followersCount: number;
  followingCount: number;
};

export type SocialComment = {
  created_at: string;
  id: string;
  post_id: string;
  text: string;
  user: {
    avatar_url: string | null;
    id: string;
    username: string;
  };
  user_id: string;
};

export type CommentablePost = {
  caption: string;
  creator_id: string;
  id: string;
  status: "draft" | "published";
};

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function toFollowCountsMessage(error: unknown) {
  const message = toMessage(error, "Failed to load follow counts.");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("get_follow_counts") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the function public.get_follow_counts")
  ) {
    return "Follow counts need the latest social database migration. Run `supabase db push`, then reload the app.";
  }

  return message;
}

function toCommentMessage(error: unknown, fallback: string) {
  const message = toMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied") ||
    normalized.includes("post_not_published")
  ) {
    return "Comments are only available on published posts.";
  }

  if (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch")
  ) {
    return "Could not reach the server. Check connection and try again.";
  }

  if (
    normalized.includes("char_length") ||
    normalized.includes("check constraint") ||
    normalized.includes("between 1 and 500")
  ) {
    return "Comments must be between 1 and 500 characters.";
  }

  return message;
}

export function isUuidLike(value: string) {
  return uuidPattern.test(value.trim());
}

export async function fetchProfileById(profileId: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .eq("id", profileId)
      .maybeSingle();

    return {
      data: (data ?? null) as SocialProfile | null,
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: toMessage(error, "Failed to load profile."),
    };
  }
}

export async function fetchProfileByUsername(username: string) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .ilike("username", username.trim())
      .maybeSingle();

    return {
      data: (data ?? null) as SocialProfile | null,
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: toMessage(error, "Failed to load profile."),
    };
  }
}

export async function searchProfilesByUsername(query: string, limit = 20) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return {
      data: [] as SocialProfile[],
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .ilike("username", `%${normalizedQuery}%`)
      .order("username", { ascending: true })
      .limit(limit);

    return {
      data: (data ?? []) as SocialProfile[],
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: [] as SocialProfile[],
      error: toMessage(error, "Failed to search profiles."),
    };
  }
}

export async function fetchUserPosts(profileId: string, limit = 12) {
  try {
    const { data, error } = await supabase
      .from("video_posts")
      .select("id, caption, video_url, created_at, status")
      .eq("creator_id", profileId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    return {
      data: (data ?? []) as SocialPost[],
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: [],
      error: toMessage(error, "Failed to load posts."),
    };
  }
}

export async function fetchPostForComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from("video_posts")
      .select("id, creator_id, caption, status")
      .eq("id", postId)
      .maybeSingle();

    return {
      data: (data ?? null) as CommentablePost | null,
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: null,
      error: toCommentMessage(error, "Failed to load post."),
    };
  }
}

export async function fetchCommentCountsForPosts(postIds: string[]) {
  if (postIds.length === 0) {
    return {
      data: {} as Record<string, number>,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    if (error) {
      return {
        data: {} as Record<string, number>,
        error: toCommentMessage(error, "Failed to load comment counts."),
      };
    }

    const counts = postIds.reduce<Record<string, number>>((acc, postId) => {
      acc[postId] = 0;
      return acc;
    }, {});

    (data ?? []).forEach((row) => {
      const postId = String(row.post_id);
      counts[postId] = (counts[postId] ?? 0) + 1;
    });

    return {
      data: counts,
      error: null,
    };
  } catch (error) {
    return {
      data: {} as Record<string, number>,
      error: toCommentMessage(error, "Failed to load comment counts."),
    };
  }
}

export async function fetchFollowCounts(profileId: string) {
  try {
    const { data, error } = await supabase.rpc("get_follow_counts", {
      target_profile_id: profileId,
    });

    if (error) {
      return {
        data: {
          followersCount: 0,
          followingCount: 0,
        } satisfies FollowCounts,
        error: toFollowCountsMessage(error),
      };
    }

    const row = Array.isArray(data) ? data[0] : data;

    return {
      data: {
        followersCount: Number(row?.followers_count ?? 0),
        followingCount: Number(row?.following_count ?? 0),
      } satisfies FollowCounts,
      error: null,
    };
  } catch (error) {
    return {
      data: {
        followersCount: 0,
        followingCount: 0,
      } satisfies FollowCounts,
      error: toFollowCountsMessage(error),
    };
  }
}

export async function isFollowingProfile(
  followerId: string,
  followeeId: string
) {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", followerId)
      .eq("followee_id", followeeId)
      .maybeSingle();

    return {
      data: Boolean(data),
      error: error?.message ?? null,
    };
  } catch (error) {
    return {
      data: false,
      error: toMessage(error, "Failed to check follow state."),
    };
  }
}

export async function followUser(followerId: string, followeeId: string) {
  try {
    const { error } = await supabase.from("follows").insert({
      follower_id: followerId,
      followee_id: followeeId,
    });

    return {
      error: error?.message ?? null,
      success: !error,
    };
  } catch (error) {
    return {
      error: toMessage(error, "Failed to follow user."),
      success: false,
    };
  }
}

export async function unfollowUser(followerId: string, followeeId: string) {
  try {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followee_id", followeeId);

    return {
      error: error?.message ?? null,
      success: !error,
    };
  } catch (error) {
    return {
      error: toMessage(error, "Failed to unfollow user."),
      success: false,
    };
  }
}

export async function listCommentsForPost(postId: string, limit = 30) {
  try {
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, user_id, text, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        data: [] as SocialComment[],
        error: toCommentMessage(error, "Failed to load comments."),
      };
    }

    const userIds = Array.from(
      new Set((data ?? []).map((comment) => String(comment.user_id)))
    );

    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds)
      : { data: [] };

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile])
    );

    const comments = (data ?? []).map((comment) => {
      const profile = profileMap.get(String(comment.user_id));
      return {
        ...comment,
        user: {
          avatar_url: profile?.avatar_url ?? null,
          id: String(comment.user_id),
          username: profile?.username ?? String(comment.user_id).slice(0, 8),
        },
      };
    }) as SocialComment[];

    return {
      data: comments,
      error: null,
    };
  } catch (error) {
    return {
      data: [] as SocialComment[],
      error: toCommentMessage(error, "Failed to load comments."),
    };
  }
}

export async function addCommentToPost(
  postId: string,
  userId: string,
  text: string
) {
  const normalizedText = text.trim().slice(0, COMMENT_MAX_LENGTH);

  if (!normalizedText) {
    return {
      error: "Comment text is required.",
      success: false,
    };
  }

  try {
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      text: normalizedText,
      user_id: userId,
    });

    return {
      error: error ? toCommentMessage(error, "Failed to add comment.") : null,
      success: !error,
    };
  } catch (error) {
    return {
      error: toCommentMessage(error, "Failed to add comment."),
      success: false,
    };
  }
}
