import type * as ImagePicker from "expo-image-picker";

export const IMAGE_POST_CROP_ASPECT: readonly [number, number] = [3, 4];

export function createImagePostPickerOptions(): ImagePicker.ImagePickerOptions {
  return {
    allowsEditing: true,
    aspect: [...IMAGE_POST_CROP_ASPECT],
    mediaTypes: ["images"],
    quality: 1,
  };
}
