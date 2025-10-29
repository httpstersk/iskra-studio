/**
 * Client-side image compression utilities.
 *
 * Uses Canvas API to compress and resize images to JPEG format
 * with configurable maximum dimensions and quality settings.
 */

import {
  JPEG_QUALITY,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
} from "@/constants/image-compression";
import {
  blobToDataUrl,
  canvasToBlob,
  getCanvasContext,
  loadImage,
} from "./image-utils";

/**
 * Compresses an image blob to JPEG format with maximum dimensions.
 *
 * Resizes the image to fit within maxWidth x maxHeight while maintaining
 * aspect ratio, then converts to JPEG with specified quality.
 * Only applies compression if it actually reduces file size.
 * Falls back gracefully if compression fails.
 *
 * @param imageBlob - The full-size image blob
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1080)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Compressed JPEG blob, or original blob if compression doesn't reduce size
 *
 * @example
 * ```ts
 * const imageBlob = new Blob([imageData], { type: 'image/png' });
 * const compressedBlob = await compressImage(imageBlob);
 * // Upload compressed version
 * await storage.upload(compressedBlob, options);
 * ```
 */
export async function compressImage(
  imageBlob: Blob,
  maxWidth: number = MAX_IMAGE_WIDTH,
  maxHeight: number = MAX_IMAGE_HEIGHT,
  quality: number = JPEG_QUALITY
): Promise<Blob> {
  try {
    const dataUrl = await blobToDataUrl(imageBlob);
    const img = await loadImage(dataUrl);

    // Calculate new dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    let needsResize = false;

    // Only resize if image exceeds maximum dimensions
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);

      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      needsResize = true;
    }

    // If image doesn't need resizing and is already JPEG, return original
    if (!needsResize && imageBlob.type === "image/jpeg") {
      return imageBlob;
    }

    // Create canvas and draw resized image
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = getCanvasContext(canvas);

    ctx.drawImage(img, 0, 0, width, height);

    // Convert canvas to JPEG blob
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);

    // Only use compressed version if it's actually smaller
    if (blob.size < imageBlob.size) {
      return blob;
    }

    // Return original if compression didn't reduce size
    return imageBlob;
  } catch (error) {
    // Return original blob if compression fails
    return imageBlob;
  }
}
