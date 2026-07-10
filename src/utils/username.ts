const USERNAME_PATTERN = /^[a-z0-9._]+$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export function normalizeUsername(input: string | null | undefined) {
  return (input ?? "").trim().toLowerCase();
}

export function isUsernameValid(input: string | null | undefined) {
  const normalized = normalizeUsername(input);

  return (
    normalized.length >= USERNAME_MIN_LENGTH &&
    normalized.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(normalized)
  );
}

export function getUsernameValidationMessage(input: string | null | undefined) {
  const normalized = normalizeUsername(input);

  if (!normalized) {
    return "Choose a username.";
  }

  if (normalized.length < USERNAME_MIN_LENGTH || normalized.length > USERNAME_MAX_LENGTH) {
    return "Username must be 3 to 30 characters.";
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return "Use only lowercase letters, numbers, periods, or underscores.";
  }

  return null;
}

export function buildDefaultUsername(userId: string, email?: string | null) {
  const rawPrefix = email?.split("@")[0] ?? "user";
  const cleanPrefix = rawPrefix.toLowerCase().replace(/[^a-z0-9._]/g, "");
  const safePrefix = cleanPrefix.length >= USERNAME_MIN_LENGTH ? cleanPrefix : "user";
  const suffix = userId.replace(/-/g, "").slice(0, 6);

  return `${safePrefix.slice(0, 23)}_${suffix}`.slice(0, USERNAME_MAX_LENGTH);
}
