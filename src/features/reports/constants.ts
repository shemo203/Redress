export const REPORT_REASONS = [
  "offensive content",
  "sexual/explicit content",
  "harassment",
  "spam",
  "broken/malicious link",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTargetType = "post" | "profile" | "link";
export type ReportReviewStatus = "open" | "reviewed" | "resolved";

export const REPORT_BLOCKLIST_DOMAIN_STUB: string[] = [];
export const REPORT_DETAILS_MAX_LENGTH = 500;
export const REPORT_REVIEW_STATUSES = ["open", "reviewed", "resolved"] as const;
