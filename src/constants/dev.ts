export const DEV_SEED_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_SEED === "true";

export const MODERATION_ADMIN_USER_IDS = (
  process.env.EXPO_PUBLIC_ADMIN_USER_IDS ?? ""
)
  .split(",")
  .map((value: string) => value.trim())
  .filter((value: string) => value.length > 0);

export function isModerationAdminUser(userId: string | null | undefined) {
  return typeof userId === "string" && MODERATION_ADMIN_USER_IDS.includes(userId);
}
