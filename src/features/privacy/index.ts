import { supabase } from "../../lib/supabaseClient";

export const PRIVACY_REQUEST_DETAILS_MAX_LENGTH = 500;

export const PRIVACY_REQUEST_TYPES = [
  "account_deletion",
  "data_export",
] as const;

export type PrivacyRequestType = (typeof PRIVACY_REQUEST_TYPES)[number];

export type PrivacyRequestRecord = {
  created_at: string;
  details: string | null;
  id: string;
  request_type: PrivacyRequestType;
  status: "requested" | "fulfilled" | "declined";
};

type SubmitPrivacyRequestInput = {
  details?: string;
  requesterId: string;
  requestType: PrivacyRequestType;
};

export function normalizePrivacyRequestDetails(details: string) {
  const trimmed = details.trim();
  return trimmed.length > 0
    ? trimmed.slice(0, PRIVACY_REQUEST_DETAILS_MAX_LENGTH)
    : "";
}

export function getPrivacyRequestLabel(requestType: PrivacyRequestType) {
  return requestType === "account_deletion"
    ? "Account deletion"
    : "Data export";
}

export async function submitPrivacyRequest({
  details = "",
  requesterId,
  requestType,
}: SubmitPrivacyRequestInput) {
  if (!PRIVACY_REQUEST_TYPES.includes(requestType)) {
    return {
      error: "Pick a privacy request type.",
      success: false,
    };
  }

  const normalizedDetails = normalizePrivacyRequestDetails(details);

  const { error } = await supabase.from("privacy_requests").insert({
    details: normalizedDetails.length > 0 ? normalizedDetails : null,
    requester_id: requesterId,
    request_type: requestType,
    status: "requested",
  });

  return {
    error: error?.message ?? null,
    success: !error,
  };
}

export async function fetchMyPrivacyRequests(userId: string) {
  const { data, error } = await supabase
    .from("privacy_requests")
    .select("id, request_type, status, details, created_at")
    .eq("requester_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    data: (data ?? []) as PrivacyRequestRecord[],
    error: error?.message ?? null,
  };
}
