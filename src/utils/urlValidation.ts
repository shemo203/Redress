const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "blob:"];

export type UrlValidationResult = {
  error: string | null;
  normalized: string;
  valid: boolean;
};

export function validateClothingTagUrl(input: string): UrlValidationResult {
  const normalized = input.trim();
  if (!normalized) {
    return {
      error: "URL is required.",
      normalized,
      valid: false,
    };
  }

  const lower = normalized.toLowerCase();
  if (BLOCKED_SCHEMES.some((scheme) => lower.startsWith(scheme))) {
    return {
      error: "Only http:// or https:// links are allowed.",
      normalized,
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
      valid: false,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      error: "Only http:// or https:// links are allowed.",
      normalized,
      valid: false,
    };
  }

  return {
    error: null,
    normalized,
    valid: true,
  };
}
