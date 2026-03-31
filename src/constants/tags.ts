export const REQUIRE_TAG_URLS =
  process.env.EXPO_PUBLIC_REQUIRE_TAG_URLS !== "false";

export const TAG_CATEGORY_OPTIONS = [
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "accessories",
  "other",
] as const;

export type TagCategory = (typeof TAG_CATEGORY_OPTIONS)[number];
