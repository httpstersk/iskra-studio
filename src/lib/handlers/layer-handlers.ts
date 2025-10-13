/**
 * Layer ordering handlers for canvas elements
 *
 * This module provides utilities for manipulating the z-order (layer order)
 * of canvas elements. In the array representation, elements later in the array
 * are rendered on top of earlier elements.
 *
 * @module lib/handlers/layer-handlers
 */

import type { PlacedImage } from "@/types/canvas";

/**
 * Moves selected images to the front (top of the stack).
 * Selected images are moved to the end of the array, maintaining their
 * relative order with each other.
 *
 * @param images - Array of all images on the canvas
 * @param selectedIds - IDs of images to move to front
 * @returns Reordered array with selected images at the end
 *
 * @example
 * ```typescript
 * const reordered = sendToFront(allImages, ['img2', 'img3']);
 * setImages(reordered);
 * ```
 */
export function sendToFront(
  images: PlacedImage[],
  selectedIds: string[],
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean) as PlacedImage[];

  const remainingImages = images.filter((img) => !selectedIds.includes(img.id));

  return [...remainingImages, ...selectedImages];
}

/**
 * Moves selected images to the back (bottom of the stack).
 * Selected images are moved to the beginning of the array, maintaining
 * their relative order with each other.
 *
 * @param images - Array of all images on the canvas
 * @param selectedIds - IDs of images to move to back
 * @returns Reordered array with selected images at the beginning
 *
 * @example
 * ```typescript
 * const reordered = sendToBack(allImages, ['img2', 'img3']);
 * setImages(reordered);
 * ```
 */
export function sendToBack(
  images: PlacedImage[],
  selectedIds: string[],
): PlacedImage[] {
  if (selectedIds.length === 0) return images;

  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean) as PlacedImage[];

  const remainingImages = images.filter((img) => !selectedIds.includes(img.id));

  return [...selectedImages, ...remainingImages];
}

/**
 * Moves selected images forward by one layer.
 * Each selected image swaps position with the next unselected image
 * in front of it. Process happens from back to front to avoid conflicts.
 *
 * @param images - Array of all images on the canvas
 * @param selectedIds - IDs of images to move forward
 * @returns Reordered array with selected images moved forward one position
 *
 * @example
 * ```typescript
 * const reordered = bringForward(allImages, ['img2']);
 * setImages(reordered);
 * ```
 */
export function bringForward(
  images: PlacedImage[],
  selectedIds: string[],
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

/**
 * Moves selected images backward by one layer.
 * Each selected image swaps position with the previous unselected image
 * behind it. Process happens from front to back to avoid conflicts.
 *
 * @param images - Array of all images on the canvas
 * @param selectedIds - IDs of images to move backward
 * @returns Reordered array with selected images moved backward one position
 *
 * @example
 * ```typescript
 * const reordered = sendBackward(allImages, ['img2']);
 * setImages(reordered);
 * ```
 */
export function sendBackward(
  images: PlacedImage[],
  selectedIds: string[],
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
