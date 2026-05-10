export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function getDetailedErrorMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error, "").trim();

  if (!message) {
    return fallback;
  }

  return `${fallback}: ${message}`;
}

export function isNetworkErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("network request failed") ||
    normalized.includes("failed to fetch")
  );
}
