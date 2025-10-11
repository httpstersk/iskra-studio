/**
 * Canvas image manipulation handlers
 * 
 * This module provides handlers for common image operations including
 * combining multiple images, duplicating elements, and deleting elements.
 * 
 * @module lib/handlers/image-handlers
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * Combines multiple selected images into a single image by rendering them
 * onto a canvas with their relative positions preserved.
 * 
 * The combined image maintains:
 * - Relative positions of all selected images
 * - Original image quality (up to 4x scale)
 * - Rotation transformations
 * - Z-order (layer order)
 * 
 * @param images - Array of all images on the canvas
 * @param selectedIds - IDs of images to combine
 * @returns Promise resolving to a new PlacedImage containing the combined result
 * 
 * @example
 * ```typescript
 * const combined = await combineImages(allImages, ['img1', 'img2', 'img3']);
 * setImages([...otherImages, combined]);
 * ```
 */
export async function combineImages(
  images: PlacedImage[],
  selectedIds: string[]
): Promise<PlacedImage> {
  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img) => img !== undefined) as PlacedImage[];

  const sortedImages = [...selectedImages].sort((a, b) => {
    const indexA = images.findIndex((img) => img.id === a.id);
    const indexB = images.findIndex((img) => img.id === b.id);
    return indexA - indexB;
  });

  const imageElements: {
    img: PlacedImage;
    element: HTMLImageElement;
    scale: number;
  }[] = [];
  let maxScale = 1;

  for (const img of sortedImages) {
    const imgElement = new window.Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.src = img.src;
    await new Promise((resolve) => {
      imgElement.onload = resolve;
    });

    const effectiveWidth = imgElement.naturalWidth;
    const effectiveHeight = imgElement.naturalHeight;

    const scaleX = effectiveWidth / img.width;
    const scaleY = effectiveHeight / img.height;
    const scale = Math.min(scaleX, scaleY);

    maxScale = Math.max(maxScale, scale);
    imageElements.push({ img, element: imgElement, scale });
  }

  const optimalScale = Math.min(maxScale, 4);

  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  sortedImages.forEach((img) => {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
  });

  const combinedWidth = maxX - minX;
  const combinedHeight = maxY - minY;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  canvas.width = Math.round(combinedWidth * optimalScale);
  canvas.height = Math.round(combinedHeight * optimalScale);

  for (const { img, element: imgElement } of imageElements) {
    const relX = (img.x - minX) * optimalScale;
    const relY = (img.y - minY) * optimalScale;
    const scaledWidth = img.width * optimalScale;
    const scaledHeight = img.height * optimalScale;

    ctx.save();

    if (img.rotation) {
      ctx.translate(relX + scaledWidth / 2, relY + scaledHeight / 2);
      ctx.rotate((img.rotation * Math.PI) / 180);
      ctx.drawImage(
        imgElement,
        -scaledWidth / 2,
        -scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );
    } else {
      ctx.drawImage(
        imgElement,
        0,
        0,
        imgElement.naturalWidth,
        imgElement.naturalHeight,
        relX,
        relY,
        scaledWidth,
        scaledHeight
      );
    }

    ctx.restore();
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(blob);
  });

  return {
    id: `combined-${Date.now()}-${Math.random()}`,
    src: dataUrl,
    x: minX,
    y: minY,
    width: combinedWidth,
    height: combinedHeight,
    rotation: 0,
  };
}

/**
 * Duplicates selected images and videos with a slight offset.
 * Creates copies of all selected elements with new IDs and positions
 * offset by 20 pixels in both x and y directions.
 * 
 * @param images - Array of all images on the canvas
 * @param videos - Array of all videos on the canvas
 * @param selectedIds - IDs of elements to duplicate
 * @returns Object containing arrays of newly created images and videos
 * 
 * @example
 * ```typescript
 * const { newImages, newVideos } = duplicateElements(
 *   allImages,
 *   allVideos,
 *   ['img1', 'vid1']
 * );
 * setImages([...allImages, ...newImages]);
 * setVideos([...allVideos, ...newVideos]);
 * ```
 */
export function duplicateElements(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[]
): { newImages: PlacedImage[]; newVideos: PlacedVideo[] } {
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));
  const newImages = selectedImages.map((img) => ({
    ...img,
    id: `img-${Date.now()}-${Math.random()}`,
    x: img.x + 20,
    y: img.y + 20,
  }));

  const selectedVideos = videos.filter((vid) => selectedIds.includes(vid.id));
  const newVideos = selectedVideos.map((vid) => ({
    ...vid,
    id: `vid-${Date.now()}-${Math.random()}`,
    x: vid.x + 20,
    y: vid.y + 20,
    currentTime: 0,
    isPlaying: false,
  }));

  return { newImages, newVideos };
}

/**
 * Deletes selected images and videos from the canvas.
 * Returns filtered arrays with selected elements removed.
 * 
 * @param images - Array of all images on the canvas
 * @param videos - Array of all videos on the canvas
 * @param selectedIds - IDs of elements to delete
 * @returns Object containing filtered arrays without deleted elements
 * 
 * @example
 * ```typescript
 * const { newImages, newVideos } = deleteElements(
 *   allImages,
 *   allVideos,
 *   ['img1', 'vid1']
 * );
 * setImages(newImages);
 * setVideos(newVideos);
 * ```
 */
export function deleteElements(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[]
): { newImages: PlacedImage[]; newVideos: PlacedVideo[] } {
  return {
    newImages: images.filter((img) => !selectedIds.includes(img.id)),
    newVideos: videos.filter((vid) => !selectedIds.includes(vid.id)),
  };
}

