import { supabase } from "../../lib/supabaseClient";

export const REPORT_REASONS = [
  "offensive content",
  "sexual/explicit content",
  "harassment",
  "spam",
  "broken/malicious link",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportTargetType = "post" | "profile" | "link";

export type ReportRecord = {
  created_at: string;
  details: string | null;
  id: string;
  reason: string;
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

export const REPORT_BLOCKLIST_DOMAIN_STUB: string[] = [];
export const REPORT_DETAILS_MAX_LENGTH = 500;

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
    .select("id, target_type, target_id, reason, details, created_at")
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    data: (data ?? []) as ReportRecord[],
    error: error?.message ?? null,
  };
}

export { ReportComposer } from "./ReportComposer";
