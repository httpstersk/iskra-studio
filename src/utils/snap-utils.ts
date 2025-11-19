/**
 * Grid snapping and alignment utilities
 *
 * This module provides utilities for snapping canvas elements to a grid,
 * checking alignment, and providing haptic feedback for snap events.
 * Useful for creating precise, aligned canvas layouts.
 *
 * @module snap-utils
 */

import { CANVAS_GRID } from "@/constants/canvas";
import type { PlacedImage } from "@/types/canvas";

/**
 * Default grid size in pixels from canvas configuration
 */
export const GRID_SIZE = CANVAS_GRID.SPACING;

/**
 * Snaps a numerical value to the nearest grid increment.
 *
 * @param value - The value to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Value snapped to nearest grid increment
 *
 * @example
 * ```typescript
 * const snapped = snapToGrid(127, 50); // Returns 150
 * const snapped2 = snapToGrid(122, 50); // Returns 100
 * ```
 */
export const snapToGrid = (
  value: number,
  gridSize: number = GRID_SIZE,
): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Snaps 2D coordinates to the nearest grid intersection point.
 *
 * @param x - X coordinate to snap
 * @param y - Y coordinate to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Object with snapped x and y coordinates
 *
 * @example
 * ```typescript
 * const pos = snapPosition(127, 83, 50);
 * // Returns { x: 150, y: 100 }
 * ```
 */
export const snapPosition = (
  x: number,
  y: number,
  gridSize: number = GRID_SIZE,
): { x: number; y: number } => {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
};

/**
 * Checks if a value is already snapped to the grid (within floating point tolerance).
 *
 * @param value - The value to check
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns True if value is already on a grid line
 *
 * @example
 * ```typescript
 * isSnappedToGrid(100, 50); // true
 * isSnappedToGrid(127, 50); // false
 * ```
 */
export const isSnappedToGrid = (
  value: number,
  gridSize: number = GRID_SIZE,
): boolean => {
  return Math.abs(value - snapToGrid(value, gridSize)) < 0.001;
};

/**
 * Snaps a placed image to the grid by adjusting its position.
 * Returns the same object if already snapped (no changes needed).
 *
 * @param image - The placed image to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Image with position snapped to grid
 *
 * @example
 * ```typescript
 * const image = { id: '1', x: 127, y: 83, width: 100, height: 100, rotation: 0 };
 * const snapped = snapImageToGrid(image, 50);
 * // Returns { ...image, x: 150, y: 100 }
 * ```
 */
export const snapImageToGrid = (
  image: PlacedImage,
  gridSize: number = GRID_SIZE,
): PlacedImage => {
  const snapped = snapPosition(image.x, image.y, gridSize);

  if (snapped.x === image.x && snapped.y === image.y) {
    return image;
  }

  return {
    ...image,
    x: snapped.x,
    y: snapped.y,
  };
};

/**
 * Snaps a placed video to the grid by adjusting its position.
 * Returns the same object if already snapped (no changes needed).
 *
 * @param video - The placed video to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Video with position snapped to grid
 *
 * @example
 * ```typescript
 * const video = { id: '1', x: 127, y: 83, width: 100, height: 100, rotation: 0, ... };
 * const snapped = snapVideoToGrid(video, 50);
 * // Returns { ...video, x: 150, y: 100 }
 * ```
 */
export const snapVideoToGrid = (
  video: import("@/types/canvas").PlacedVideo,
  gridSize: number = GRID_SIZE,
): import("@/types/canvas").PlacedVideo => {
  const snapped = snapPosition(video.x, video.y, gridSize);

  if (snapped.x === video.x && snapped.y === video.y) {
    return video;
  }

  return {
    ...video,
    x: snapped.x,
    y: snapped.y,
  };
};

/**
 * Snaps multiple images to the grid in a single operation.
 * Returns the same array reference if no changes needed (optimization).
 *
 * @param images - Array of placed images to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Array of images with positions snapped to grid
 *
 * @example
 * ```typescript
 * const images = [
 *   { id: '1', x: 127, y: 83, width: 100, height: 100, rotation: 0 },
 *   { id: '2', x: 200, y: 200, width: 100, height: 100, rotation: 0 }
 * ];
 * const snapped = snapImagesToGrid(images, 50);
 * // First image snapped, second already aligned
 * ```
 */
export const snapImagesToGrid = (
  images: PlacedImage[],
  gridSize: number = GRID_SIZE,
): PlacedImage[] => {
  let hasChanges = false;

  const snappedImages = images.map((image) => {
    const snappedImage = snapImageToGrid(image, gridSize);

    if (snappedImage !== image) {
      hasChanges = true;
    }

    return snappedImage;
  });

  return hasChanges ? snappedImages : images;
};

/**
 * Snaps multiple videos to the grid in a single operation.
 * Returns the same array reference if no changes needed (optimization).
 *
 * @param videos - Array of placed videos to snap
 * @param gridSize - Size of grid cells (default: GRID_SIZE constant)
 * @returns Array of videos with positions snapped to grid
 */
export const snapVideosToGrid = (
  videos: import("@/types/canvas").PlacedVideo[],
  gridSize: number = GRID_SIZE,
): import("@/types/canvas").PlacedVideo[] => {
  let hasChanges = false;

  const snappedVideos = videos.map((video) => {
    const snappedVideo = snapVideoToGrid(video, gridSize);

    if (snappedVideo !== video) {
      hasChanges = true;
    }

    return snappedVideo;
  });

  return hasChanges ? snappedVideos : videos;
};

/**
 * Checks if haptic feedback (vibration) is available in the current browser.
 * The Vibration API is supported on most mobile devices and some desktop browsers.
 *
 * @returns True if navigator.vibrate is available
 *
 * @example
 * ```typescript
 * if (isHapticAvailable()) {
 *   navigator.vibrate(10);
 * }
 * ```
 */
const isHapticAvailable = (): boolean => {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
};

/**
 * Triggers a subtle haptic feedback pulse when elements snap to the grid.
 * Only works on devices that support the Vibration API (most mobile devices).
 * Provides tactile confirmation of snap events for better UX.
 *
 * @example
 * ```typescript
 * // Call when element position snaps to grid
 * if (positionChanged) {
 *   triggerSnapHaptic();
 * }
 * ```
 */
export const triggerSnapHaptic = (): void => {
  if (isHapticAvailable()) {
    // Short 10ms pulse for subtle feedback
    navigator.vibrate(10);
  }
};

/**
 * Creates a snap feedback tracker that triggers haptic feedback when
 * position changes after snapping. Maintains internal state to detect
 * actual snap position changes.
 *
 * Note: This is a factory function, not a React hook despite the name.
 *
 * @returns Function that accepts x, y coordinates and returns snapped position
 *
 * @example
 * ```typescript
 * const snapWithFeedback = useSnapFeedback();
 *
 * const handleDrag = (x: number, y: number) => {
 *   const snapped = snapWithFeedback(x, y);
 *   // Haptic feedback triggered automatically when snap position changes
 *   updatePosition(snapped.x, snapped.y);
 * };
 * ```
 */
export const useSnapFeedback = (gridSize: number = GRID_SIZE) => {
  let lastSnappedX: number | null = null;
  let lastSnappedY: number | null = null;

  return (x: number, y: number) => {
    const snapped = snapPosition(x, y, gridSize);

    if (lastSnappedX !== null && lastSnappedY !== null) {
      if (snapped.x !== lastSnappedX || snapped.y !== lastSnappedY) {
        triggerSnapHaptic();
      }
    }

    lastSnappedX = snapped.x;
    lastSnappedY = snapped.y;

    return snapped;
  };
};

/**
 * Calculates snap lines for an image being dragged relative to other images.
 * Checks for alignment with edges (left, right, top, bottom) and centers.
 *
 * @param activeImage - The image being dragged
 * @param otherImages - Array of other images to snap to
 * @param threshold - Distance in pixels to trigger snapping (default: 10)
 * @returns Object containing snapped position and array of snap lines to render
 */
export const calculateSnapLines = (
  activeImage: PlacedImage,
  otherImages: PlacedImage[],
  threshold: number = 10,
): { x: number; y: number; snapLines: import("@/types/canvas").SnapLine[] } => {
  let newX = activeImage.x;
  let newY = activeImage.y;
  const snapLines: import("@/types/canvas").SnapLine[] = [];

  // Calculate active image edges and center
  const activeLeft = activeImage.x;
  const activeRight = activeImage.x + activeImage.width;
  const activeTop = activeImage.y;
  const activeBottom = activeImage.y + activeImage.height;
  const activeCenterX = activeImage.x + activeImage.width / 2;
  const activeCenterY = activeImage.y + activeImage.height / 2;

  // Track closest snaps to prioritize closest lines
  let minDistX = threshold;
  let minDistY = threshold;

  otherImages.forEach((img) => {
    if (img.id === activeImage.id) return;

    const imgLeft = img.x;
    const imgRight = img.x + img.width;
    const imgTop = img.y;
    const imgBottom = img.y + img.height;
    const imgCenterX = img.x + img.width / 2;
    const imgCenterY = img.y + img.height / 2;

    // Vertical snapping (X-axis alignment)
    const checkVerticalSnap = (
      val1: number,
      val2: number,
      snapX: number,
      lineX: number,
    ) => {
      const dist = Math.abs(val1 - val2);
      if (dist < minDistX) {
        minDistX = dist;
        newX = snapX;
        // Clear previous vertical lines as we found a closer one
        const horizontalLines = snapLines.filter(
          (l) => l.orientation === "horizontal",
        );
        snapLines.length = 0;
        snapLines.push(...horizontalLines);
        snapLines.push({
          orientation: "vertical",
          x: lineX,
          start: Math.min(activeTop, imgTop),
          end: Math.max(activeBottom, imgBottom),
        });
      } else if (dist === minDistX && dist < threshold) {
        // Add additional line if equidistant
        snapLines.push({
          orientation: "vertical",
          x: lineX,
          start: Math.min(activeTop, imgTop),
          end: Math.max(activeBottom, imgBottom),
        });
      }
    };

    // Left to Left
    checkVerticalSnap(activeLeft, imgLeft, imgLeft, imgLeft);
    // Left to Right
    checkVerticalSnap(activeLeft, imgRight, imgRight, imgRight);
    // Right to Left
    checkVerticalSnap(
      activeRight,
      imgLeft,
      imgLeft - activeImage.width,
      imgLeft,
    );
    // Right to Right
    checkVerticalSnap(
      activeRight,
      imgRight,
      imgRight - activeImage.width,
      imgRight,
    );
    // Center to Center
    checkVerticalSnap(
      activeCenterX,
      imgCenterX,
      imgCenterX - activeImage.width / 2,
      imgCenterX,
    );

    // Horizontal snapping (Y-axis alignment)
    const checkHorizontalSnap = (
      val1: number,
      val2: number,
      snapY: number,
      lineY: number,
    ) => {
      const dist = Math.abs(val1 - val2);
      if (dist < minDistY) {
        minDistY = dist;
        newY = snapY;
        // Clear previous horizontal lines as we found a closer one
        const verticalLines = snapLines.filter(
          (l) => l.orientation === "vertical",
        );
        snapLines.length = 0;
        snapLines.push(...verticalLines);
        snapLines.push({
          orientation: "horizontal",
          y: lineY,
          start: Math.min(activeLeft, imgLeft),
          end: Math.max(activeRight, imgRight),
        });
      } else if (dist === minDistY && dist < threshold) {
        snapLines.push({
          orientation: "horizontal",
          y: lineY,
          start: Math.min(activeLeft, imgLeft),
          end: Math.max(activeRight, imgRight),
        });
      }
    };

    // Top to Top
    checkHorizontalSnap(activeTop, imgTop, imgTop, imgTop);
    // Top to Bottom
    checkHorizontalSnap(activeTop, imgBottom, imgBottom, imgBottom);
    // Bottom to Top
    checkHorizontalSnap(
      activeBottom,
      imgTop,
      imgTop - activeImage.height,
      imgTop,
    );
    // Bottom to Bottom
    checkHorizontalSnap(
      activeBottom,
      imgBottom,
      imgBottom - activeImage.height,
      imgBottom,
    );
    // Center to Center
    checkHorizontalSnap(
      activeCenterY,
      imgCenterY,
      imgCenterY - activeImage.height / 2,
      imgCenterY,
    );
  });

  return { x: newX, y: newY, snapLines };
};
