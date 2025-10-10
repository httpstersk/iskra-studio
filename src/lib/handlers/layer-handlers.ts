import type { PlacedImage } from "@/types/canvas";

export function sendToFront(
  images: PlacedImage[],
  selectedIds: string[]
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean) as PlacedImage[];

  const remainingImages = images.filter(
    (img) => !selectedIds.includes(img.id)
  );

  return [...remainingImages, ...selectedImages];
}

export function sendToBack(
  images: PlacedImage[],
  selectedIds: string[]
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean) as PlacedImage[];

  const remainingImages = images.filter(
    (img) => !selectedIds.includes(img.id)
  );

  return [...selectedImages, ...remainingImages];
}

export function bringForward(
  images: PlacedImage[],
  selectedIds: string[]
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const result = [...images];

  for (let i = result.length - 2; i >= 0; i--) {
    if (
      selectedIds.includes(result[i].id) &&
      !selectedIds.includes(result[i + 1].id)
    ) {
      [result[i], result[i + 1]] = [result[i + 1], result[i]];
    }
  }

  return result;
}

export function sendBackward(
  images: PlacedImage[],
  selectedIds: string[]
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const result = [...images];

  for (let i = 1; i < result.length; i++) {
    if (
      selectedIds.includes(result[i].id) &&
      !selectedIds.includes(result[i - 1].id)
    ) {
      [result[i], result[i - 1]] = [result[i - 1], result[i]];
    }
  }

  return result;
}
