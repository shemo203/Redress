const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "blob:"];

export type UrlValidationResult = {
  error: string | null;
  normalized: string;
  present: boolean;
  valid: boolean;
};

type ValidateClothingTagUrlOptions = {
  requireUrl?: boolean;
};

export function validateClothingTagUrl(
  input: string | null | undefined,
  options: ValidateClothingTagUrlOptions = {}
): UrlValidationResult {
  const normalized = (input ?? "").trim();
  const requireUrl = options.requireUrl ?? true;
  if (!normalized) {
    return {
      error: requireUrl ? "URL is required." : null,
      normalized,
      present: false,
      valid: !requireUrl,
    };
  }

  const lower = normalized.toLowerCase();
  if (BLOCKED_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return {
      error: "Only http:// or https:// links are allowed.",
      normalized,
      present: true,
      valid: false,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      error: "Enter a valid URL.",
      normalized,
      present: true,
      valid: false,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      error: "Only http:// or https:// links are allowed.",
      normalized,
      present: true,
      valid: false,
    };
  }

  return {
    error: null,
    normalized,
    present: true,
    valid: true,
  };
}
