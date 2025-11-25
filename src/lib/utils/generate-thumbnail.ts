/**
 * Client-side thumbnail generation for images.
 *
 * Uses Canvas API to generate optimized thumbnails (400x400 WebP)
 * from full-size images. Runs on the client to avoid server-side
 * dependencies while maintaining bandwidth optimization.
 */

import {
  blobToDataUrl,
  canvasToBlob,
  getCanvasContext,
  loadImage,
} from "./image-utils";

// Constants
const DEFAULT_THUMBNAIL_SIZE = 400;
const THUMBNAIL_FORMAT = "image/webp" as const;
const THUMBNAIL_QUALITY = 0.9;

/**
 * Calculates thumbnail dimensions while maintaining aspect ratio.
 *
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param maxSize - Maximum dimension for the thumbnail
 * @returns Object containing calculated width and height
 */
function calculateThumbnailDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number,
): { height: number; width: number } {
  const aspectRatio = originalWidth / originalHeight;
  const isLandscape = originalWidth > originalHeight;

  if (isLandscape && originalWidth > maxSize) {
    return {
      height: Math.round(maxSize / aspectRatio),
      width: maxSize,
    };
  }

  if (!isLandscape && originalHeight > maxSize) {
    return {
      height: maxSize,
      width: Math.round(maxSize * aspectRatio),
    };
  }

  return {
    height: originalHeight,
    width: originalWidth,
  };
}

/**
 * Generates a thumbnail blob from an image blob.
 *
 * Creates a 400x400px WebP thumbnail while maintaining aspect ratio.
 * Falls back gracefully if thumbnail generation fails.
 *
 * @param imageBlob - The full-size image blob
 * @param maxSize - Maximum dimension (default: 400px)
 * @returns Thumbnail blob, or undefined if generation fails
 *
 * @example
 * ```ts
 * const imageBlob = new Blob([imageData], { type: 'image/jpeg' });
 * const thumbnailBlob = await generateThumbnail(imageBlob);
 *
 * if (thumbnailBlob) {
 *   formData.append('thumbnail', thumbnailBlob);
 * }
 * ```
 */
export async function generateThumbnail(
  imageBlob: Blob,
  maxSize: number = DEFAULT_THUMBNAIL_SIZE,
): Promise<Blob | undefined> {
  try {
    const dataUrl = await blobToDataUrl(imageBlob);
    const img = await loadImage(dataUrl);

    const { height, width } = calculateThumbnailDimensions(
      img.width,
      img.height,
      maxSize,
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = getCanvasContext(canvas);

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(
      canvas,
      THUMBNAIL_FORMAT,
      THUMBNAIL_QUALITY,
    );

    return blob;
  } catch (_error) {
    return undefined;
  }
}
