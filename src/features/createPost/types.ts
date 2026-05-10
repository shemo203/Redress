import type { TagCategory } from "../../constants";

export type MediaType = "image" | "video";

export type PickedMedia = {
  fileName: string | null;
  fileSize: number | null;
  mediaType: MediaType;
  mimeType: string | null;
  uri: string;
};

export type PendingTag = {
  brand: string;
  category: TagCategory;
  id: string;
  name: string;
  url: string;
};

export type SubmitMode = "draft" | "published";

export type SubmitResult = {
  message: string;
  postId: string;
  status: SubmitMode;
};
