export type TopListPeriod = "today" | "week" | "all";

export type TopListEntry = {
  avatarUrl: string | null;
  avgGrade: number;
  caption: string;
  creatorId: string;
  gradeCount: number;
  itemCount: number;
  mediaType: "image" | "video";
  postId: string;
  publishedAt: string;
  rank: number;
  username: string;
  videoUrl: string;
};

export const TOP_LIST_PERIODS: Array<{
  key: TopListPeriod;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All Time" },
];

export function getTopRatedLabel(period: TopListPeriod) {
  switch (period) {
    case "today":
      return "👑 Top rated today";
    case "week":
      return "👑 Top rated this week";
    case "all":
      return "👑 Top rated all time";
    default:
      return "👑 Top rated";
  }
}
