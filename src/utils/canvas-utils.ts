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
import type { CanvasElement } from "@/lib/storage";

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
  id: image.id,
  type: "image",
  imageId: image.id, // We'll use the same ID for both
  transform: {
    x: image.x,
    y: image.y,
    scale: 1, // We store width/height separately, so scale is 1
    rotation: image.rotation,
  },
  zIndex: 0, // We'll use array order instead
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
  id: video.id,
  type: "video",
  videoId: video.id, // We'll use the same ID for both
  transform: {
    x: video.x,
    y: video.y,
    scale: 1, // We store width/height separately, so scale is 1
    rotation: video.rotation,
  },
  zIndex: 0, // We'll use array order instead
  width: video.width,
  height: video.height,
  duration: video.duration,
  currentTime: video.currentTime,
  isPlaying: video.isPlaying,
  volume: video.volume,
  muted: video.muted,
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
