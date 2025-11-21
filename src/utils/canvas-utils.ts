/**
 * Canvas element conversion utilities
 *
 * This module provides utilities for converting between canvas element types
 * and storage formats.
 *
 * For coordinate transformations, see viewport-utils.
 * For bounding box calculations, see transform-utils.
 *
 * @module canvas-utils
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { CanvasElement } from "@/types/project";

/**
 * Converts a PlacedImage to storage format (CanvasElement).
 *
 * @param image - The placed image to convert
 * @returns Canvas element in storage format
 *
 * @example
 * ```typescript
 * const image = { id: '1', x: 100, y: 100, width: 200, height: 150, rotation: 0 };
 * const element = imageToCanvasElement(image);
 * ```
 */
export const imageToCanvasElement = (image: PlacedImage): CanvasElement => ({
  assetId: image.assetId,
  assetSyncedAt: image.assetSyncedAt,
  assetType: "image",
  id: image.id,
  type: "image",
  transform: {
    x: image.x,
    y: image.y,
    scale: 1,
    rotation: image.rotation,
  },
  zIndex: 0,
  width: image.width,
  height: image.height,
});

/**
 * Converts a PlacedVideo to storage format (CanvasElement).
 *
 * @param video - The placed video to convert
 * @returns Canvas element in storage format
 *
 * @example
 * ```typescript
 * const video = { id: '1', x: 100, y: 100, width: 200, height: 150, rotation: 0, ... };
 * const element = videoToCanvasElement(video);
 * ```
 */
export const videoToCanvasElement = (video: PlacedVideo): CanvasElement => ({
  assetId: video.assetId,
  assetSyncedAt: video.assetSyncedAt,
  assetType: "video",
  currentTime: video.currentTime,
  duration: video.duration,
  height: video.height,
  id: video.id,
  isPlaying: video.isPlaying,
  muted: video.muted,
  transform: {
    x: video.x,
    y: video.y,
    scale: 1,
    rotation: video.rotation,
  },
  type: "video",
  volume: video.volume,
  width: video.width,
  zIndex: 0,
});

/**
 * Calculates the centered placement for an image within the viewport.
 *
 * @param canvasSize - The dimensions of the canvas
 * @param viewport - The current viewport settings
 * @param imageWidth - The width of the image to place
 * @param imageHeight - The height of the image to place
 * @returns The calculated x, y, width, and height for the image
 */
export const calculateCenteredPlacement = (
  canvasSize: { width: number; height: number },
  viewport: { x: number; y: number; scale: number },
  imageWidth: number,
  imageHeight: number,
) => {
  // Place at center of viewport
  const viewportCenterX = (canvasSize.width / 2 - viewport.x) / viewport.scale;
  const viewportCenterY = (canvasSize.height / 2 - viewport.y) / viewport.scale;

  // Preserve aspect ratio while limiting the longest side to 512px
  const maxDisplay = 512;
  const scale = Math.min(
    maxDisplay / Math.max(imageWidth, 1),
    maxDisplay / Math.max(imageHeight, 1),
    1,
  );
  const width = Math.max(1, Math.round(imageWidth * scale));
  const height = Math.max(1, Math.round(imageHeight * scale));

  return {
    x: viewportCenterX - width / 2,
    y: viewportCenterY - height / 2,
    width,
    height,
  };
};

/**
 * Converts an image URL to a Blob by drawing it to a canvas.
 * This is useful for converting images (including cross-origin) to a format suitable for upload.
 *
 * @param src - The source URL of the image
 * @returns A Promise that resolves to the image Blob
 */
export const convertImageToBlob = async (src: string): Promise<Blob> => {
  // Load the image
  const imgElement = new window.Image();
  imgElement.crossOrigin = "anonymous"; // Enable CORS
  imgElement.src = src;

  await new Promise((resolve, reject) => {
    imgElement.onload = resolve;
    imgElement.onerror = reject;
  });

  // Create a canvas for the image at original resolution
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // Set canvas size to the original resolution (not display size)
  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;

  ctx.drawImage(imgElement, 0, 0);

  // Convert to blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to convert canvas to blob"));
      }
    }, "image/png");
  });
};
