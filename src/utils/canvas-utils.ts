/**
 * Canvas element conversion and coordinate utilities
 *
 * This module provides utilities for converting between canvas element types
 * and storage formats, coordinate transformations, and bounding box calculations
 * for rotated elements.
 *
 * @module canvas-utils
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { CanvasElement } from "@/types/project";

/**
 * Viewport state representing the current view of the canvas.
 * @deprecated Use Viewport from viewport-utils instead
 */
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

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
 * Converts canvas coordinates to screen coordinates based on viewport.
 * @deprecated Use canvasToScreen from viewport-utils instead
 *
 * @param canvasX - X coordinate in canvas space
 * @param canvasY - Y coordinate in canvas space
 * @param viewport - Current viewport state
 * @returns Screen coordinates
 *
 * @example
 * ```typescript
 * const viewport = { x: 100, y: 50, scale: 1.5 };
 * const screen = canvasToScreen(200, 150, viewport);
 * ```
 */
export const canvasToScreen = (
  canvasX: number,
  canvasY: number,
  viewport: Viewport,
): { x: number; y: number } => {
  return {
    x: canvasX * viewport.scale + viewport.x,
    y: canvasY * viewport.scale + viewport.y,
  };
};

/**
 * Calculates axis-aligned bounding box for an image considering rotation.
 * Returns the smallest rectangle that fully contains the rotated image.
 * @deprecated Use calculateRotatedBoundingBox from transform-utils instead
 *
 * @param image - The placed image with rotation
 * @returns Bounding box dimensions
 *
 * @example
 * ```typescript
 * const image = { x: 100, y: 100, width: 100, height: 50, rotation: 45, ... };
 * const bbox = calculateBoundingBox(image);
 * // Returns expanded bbox that contains the rotated rectangle
 * ```
 */
export const calculateBoundingBox = (
  image: PlacedImage,
): { x: number; y: number; width: number; height: number } => {
  const { x, y, width, height, rotation } = image;

  // If no rotation, return simple bounding box
  if (!rotation || rotation === 0) {
    return {
      x,
      y,
      width,
      height,
    };
  }

  // Convert rotation from degrees to radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Calculate the four corners of the original rectangle
  const corners = [
    { x: 0, y: 0 }, // top-left
    { x: width, y: 0 }, // top-right
    { x: width, y: height }, // bottom-right
    { x: 0, y: height }, // bottom-left
  ];

  // Rotate each corner around the top-left corner (0,0)
  const rotatedCorners = corners.map((corner) => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos,
  }));

  // Find the bounding box of the rotated corners
  const xs = rotatedCorners.map((c) => c.x);
  const ys = rotatedCorners.map((c) => c.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: x + minX,
    y: y + minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

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
