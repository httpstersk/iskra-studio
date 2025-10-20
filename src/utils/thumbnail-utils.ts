/**
 * Thumbnail generation utilities for project previews.
 *
 * Provides functions to capture canvas screenshots and upload them
 * to Convex storage for use as project thumbnails.
 */

import type Konva from "konva";

/**
 * Default thumbnail dimensions.
 */
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 169;

/**
 * Generates a thumbnail from a Konva stage.
 *
 * Captures the current canvas state as a 300x200px image.
 * The stage is temporarily scaled to fit the thumbnail dimensions
 * while preserving the aspect ratio.
 *
 * @param stage - Konva stage instance to capture
 * @param width - Thumbnail width in pixels (default: 300)
 * @param height - Thumbnail height in pixels (default: 200)
 * @returns Data URL of the thumbnail image (PNG format)
 *
 * @example
 * ```ts
 * const thumbnailDataUrl = await generateThumbnail(stageRef.current);
 * ```
 */
export async function generateThumbnail(
  stage: Konva.Stage | null,
  width: number = THUMBNAIL_WIDTH,
  height: number = THUMBNAIL_HEIGHT
): Promise<string> {
  if (!stage) {
    throw new Error("Stage is not available");
  }

  try {
    // Get current stage dimensions and scale
    const originalWidth = stage.width();
    const originalHeight = stage.height();
    const originalScale = stage.scaleX(); // Assuming uniform scale

    // Calculate scale to fit stage into thumbnail dimensions
    const scaleX = width / originalWidth;
    const scaleY = height / originalHeight;
    const scale = Math.min(scaleX, scaleY);

    // Temporarily apply thumbnail scale
    stage.scale({ x: scale, y: scale });

    // Generate thumbnail using stage.toDataURL
    const dataUrl = stage.toDataURL({
      mimeType: "image/png",
      quality: 0.8,
      pixelRatio: 1,
    });

    // Restore original scale
    stage.scale({ x: originalScale, y: originalScale });

    return dataUrl;
  } catch (error) {
    console.error("Failed to generate thumbnail:", error);
    throw new Error(
      `Thumbnail generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Uploads a thumbnail to Convex storage.
 *
 * Converts a data URL to a Blob and uploads it via the Convex upload API.
 * Returns the storage ID which can be stored in the project record.
 *
 * @param dataUrl - Data URL of the thumbnail image
 * @param userId - User ID for authentication
 * @returns Storage ID and URL from Convex
 *
 * @example
 * ```ts
 * const dataUrl = await generateThumbnail(stage);
 * const { storageId, url } = await uploadThumbnail(dataUrl, userId);
 * ```
 */
export async function uploadThumbnail(
  dataUrl: string,
  userId: string
): Promise<{ storageId: string; url: string }> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create form data
    const formData = new FormData();
    formData.append("file", blob, "thumbnail.png");

    // Upload to Convex
    const uploadResponse = await fetch("/api/convex/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await uploadResponse.json();

    return {
      storageId: result.storageId,
      url: result.url,
    };
  } catch (error) {
    console.error("Failed to upload thumbnail:", error);
    throw new Error(
      `Thumbnail upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generates and uploads a project thumbnail in one operation.
 *
 * Convenience function that combines generateThumbnail and uploadThumbnail.
 *
 * @param stage - Konva stage instance to capture
 * @param userId - User ID for authentication
 * @returns Storage ID and URL from Convex
 *
 * @example
 * ```ts
 * const { storageId, url } = await generateAndUploadThumbnail(
 *   stageRef.current,
 *   userId
 * );
 *
 * // Store storageId in project record
 * await saveProject({
 *   projectId,
 *   canvasState,
 *   thumbnailStorageId: storageId,
 * });
 * ```
 */
export async function generateAndUploadThumbnail(
  stage: Konva.Stage | null,
  userId: string
): Promise<{ storageId: string; url: string }> {
  const dataUrl = await generateThumbnail(stage);
  return await uploadThumbnail(dataUrl, userId);
}

/**
 * Converts a data URL to a Blob.
 *
 * Utility function for working with data URLs.
 *
 * @param dataUrl - Data URL to convert
 * @returns Blob containing the image data
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Generates a placeholder thumbnail for empty projects.
 *
 * Creates a simple gray canvas as a fallback when no canvas content exists.
 *
 * @param width - Thumbnail width in pixels (default: 300)
 * @param height - Thumbnail height in pixels (default: 200)
 * @returns Data URL of the placeholder image
 */
export function generatePlaceholderThumbnail(
  width: number = THUMBNAIL_WIDTH,
  height: number = THUMBNAIL_HEIGHT
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Fill with dark gray background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  // Add centered text
  ctx.fillStyle = "#666";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Empty Project", width / 2, height / 2);

  return canvas.toDataURL("image/png");
}
