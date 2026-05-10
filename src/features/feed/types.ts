export type FeedTag = {
  brand: string | null;
  category: string | null;
  id: string;
  name: string;
  url: string | null;
};

export type FeedPost = {
  caption: string;
  creator_avatar_url: string | null;
  created_at: string;
  creator_id: string;
  creator_username: string;
  id: string;
  instanceKey: string;
  media_type: "image" | "video";
  tags: FeedTag[];
  video_url: string;
};

export type FeedPostSourceRow = {
  caption: string | null;
  created_at: string;
  creator_id: string;
  id: string;
  media_type: "image" | "video";
  video_url: string;
};

export type RankedFeedPostRow = {
  caption: FeedPostSourceRow["caption"];
  created_at: FeedPostSourceRow["created_at"];
  creator_id: FeedPostSourceRow["creator_id"];
  id: FeedPostSourceRow["id"];
  media_type: FeedPostSourceRow["media_type"];
  published_at: string | null;
  ranking_score: number;
  seen_by_viewer: boolean;
  video_url: FeedPostSourceRow["video_url"];
};
