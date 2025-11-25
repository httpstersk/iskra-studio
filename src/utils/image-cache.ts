/**
 * Image cache utilities for optimizing image rendering performance.
 *
 * Uses WeakRef + FinalizationRegistry for automatic memory management (ESNext).
 *
 * @module utils/image-cache
 */

import { weakImageCache } from "./weak-image-cache";

/**
 * Legacy Map-based cache for browsers without WeakRef support
 */
const legacyCache = new Map<string, HTMLImageElement>();

/**
 * Feature detection for WeakRef support
 */
const hasWeakRefSupport = typeof WeakRef !== "undefined";

/**
 * Caches a preloaded pixelated image for immediate rendering.
 *
 * Uses WeakRef for automatic garbage collection in modern browsers,
 * falls back to Map for older browsers.
 *
 * @param dataUrl - Data URL of the pixelated image
 * @param image - Preloaded image element
 */
export function cachePixelatedImage(
  dataUrl: string,
  image: HTMLImageElement,
): void {
  if (hasWeakRefSupport) {
    weakImageCache.set(dataUrl, image);
  } else {
    legacyCache.set(dataUrl, image);
  }
}

/**
 * Retrieves a cached pixelated image.
 *
 * @param dataUrl - Data URL to look up
 * @returns Cached image element or undefined if not found/GC'd
 */
export function getCachedPixelatedImage(
  dataUrl: string,
): HTMLImageElement | undefined {
  if (hasWeakRefSupport) {
    return weakImageCache.get(dataUrl);
  }
  return legacyCache.get(dataUrl);
}

/**
 * Clears the pixelated image cache.
 * Useful for memory management when cache grows too large.
 */
export function clearPixelatedImageCache(): void {
  if (hasWeakRefSupport) {
    weakImageCache.clear();
  } else {
    legacyCache.clear();
  }
}

/**
 * Gets the current size of the pixelated image cache.
 * Note: With WeakRef, this may include garbage-collected entries.
 *
 * @returns Number of cached images
 */
export function getPixelatedImageCacheSize(): number {
  if (hasWeakRefSupport) {
    return weakImageCache.size;
  }
  return legacyCache.size;
}

/**
 * Gets count of alive (non-GC'd) images in cache.
 * Only meaningful with WeakRef support.
 *
 * @returns Number of alive cached images
 */
export function getAlivePixelatedImageCount(): number {
  if (hasWeakRefSupport) {
    return weakImageCache.getAliveCount();
  }
  return legacyCache.size;
}
