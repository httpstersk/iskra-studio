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
export const useSnapFeedback = () => {
  let lastSnappedX: number | null = null;
  let lastSnappedY: number | null = null;

  return (x: number, y: number) => {
    const snapped = snapPosition(x, y);

    // Trigger haptic feedback if position changed after snapping
    if (
      (lastSnappedX !== null && lastSnappedX !== snapped.x) ||
      (lastSnappedY !== null && lastSnappedY !== snapped.y)
    ) {
      triggerSnapHaptic();
    }

    lastSnappedX = snapped.x;
    lastSnappedY = snapped.y;

    return snapped;
  };
};
