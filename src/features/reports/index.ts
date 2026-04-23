import { supabase } from "../../lib/supabaseClient";
export {
  REPORT_BLOCKLIST_DOMAIN_STUB,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_REVIEW_STATUSES,
  type ReportReason,
  type ReportReviewStatus,
  type ReportTargetType,
} from "./constants";
import {
  REPORT_BLOCKLIST_DOMAIN_STUB,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  REPORT_REVIEW_STATUSES,
  type ReportReason,
  type ReportReviewStatus,
  type ReportTargetType,
} from "./constants";

export type ReportRecord = {
  created_at: string;
  details: string | null;
  id: string;
  reason: string;
  review_status?: ReportReviewStatus;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  target_id: string;
  target_type: ReportTargetType;
};

export type ModerationReportRecord = {
  created_at: string;
  details: string | null;
  id: string;
  reason: ReportReason;
  reporter_id: string;
  reporter_username: string | null;
  review_status: ReportReviewStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  target_id: string;
  target_type: ReportTargetType;
};

type SubmitReportInput = {
  details?: string;
  reason: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
};

export function normalizeReportDetails(details: string) {
  return details.trim().slice(0, REPORT_DETAILS_MAX_LENGTH);
}

export function buildLinkReportDetails(url: string, details: string) {
  const prefix = `Link URL: ${url}`;
  const remaining = Math.max(REPORT_DETAILS_MAX_LENGTH - prefix.length - 2, 0);
  const normalizedDetails = details.trim().slice(0, remaining);

  return normalizedDetails.length > 0
    ? `${prefix}\n\n${normalizedDetails}`
    : prefix;
}

export function isValidReportReason(reason: string): reason is ReportReason {
  return REPORT_REASONS.includes(reason as ReportReason);
}

export function isValidReportReviewStatus(
  reviewStatus: string
): reviewStatus is ReportReviewStatus {
  return REPORT_REVIEW_STATUSES.includes(reviewStatus as ReportReviewStatus);
}

export async function submitReport({
  details = "",
  reason,
  reporterId,
  targetId,
  targetType,
}: SubmitReportInput) {
  const trimmedTargetId = targetId.trim();

  if (!trimmedTargetId) {
    return {
      error: "Missing report target.",
      success: false,
    };
  }

  if (!isValidReportReason(reason)) {
    return {
      error: "Pick a report reason.",
      success: false,
    };
  }

  const normalizedDetails = normalizeReportDetails(details);

  const { error } = await supabase.from("reports").insert({
    details: normalizedDetails.length > 0 ? normalizedDetails : null,
    reason,
    reporter_id: reporterId,
    target_id: trimmedTargetId,
    target_type: targetType,
  });

  return {
    error: error?.message ?? null,
    success: !error,
  };
}

export async function fetchMyReports(userId: string) {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, target_type, target_id, reason, details, created_at, review_status, reviewed_at, reviewed_by"
    )
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    data: (data ?? []) as ReportRecord[],
    error: error?.message ?? null,
  };
}

export async function fetchReportsForReview({
  reason,
  targetType,
}: {
  reason?: ReportReason | null;
  targetType?: ReportTargetType | null;
}) {
  const { data, error } = await supabase.rpc("list_reports_for_review", {
    filter_reason: reason ?? null,
    filter_target_type: targetType ?? null,
  });

  return {
    data: (data ?? []) as ModerationReportRecord[],
    error: error?.message ?? null,
  };
}

export async function updateReportReviewStatus(
  reportId: string,
  reviewStatus: Extract<ReportReviewStatus, "reviewed" | "resolved">
) {
  if (!reportId.trim()) {
    return {
      data: null,
      error: "Missing report id.",
    };
  }

  if (!isValidReportReviewStatus(reviewStatus)) {
    return {
      data: null,
      error: "Invalid review status.",
    };
  }

  const { data, error } = await supabase.rpc("set_report_review_status", {
    next_review_status: reviewStatus,
    target_report_id: reportId,
  });

  return {
    data: (data ?? null) as ReportRecord | null,
    error: error?.message ?? null,
  };
}

export { ReportComposer } from "./ReportComposer";
