/**
 * Image cache utilities for optimizing image rendering performance.
 *
 * @module utils/image-cache
 */

/**
 * Cache for preloaded pixelated images to avoid re-rendering delays.
 *
 * Stores HTMLImageElement instances keyed by their data URL to enable
 * immediate rendering without waiting for image load events.
 */
const pixelatedImageCache = new Map<string, HTMLImageElement>();

/**
 * Caches a preloaded pixelated image for immediate rendering.
 *
 * @param dataUrl - Data URL of the pixelated image
 * @param image - Preloaded image element
 */
export function cachePixelatedImage(
  dataUrl: string,
  image: HTMLImageElement,
): void {
  pixelatedImageCache.set(dataUrl, image);
}

/**
 * Retrieves a cached pixelated image.
 *
 * @param dataUrl - Data URL to look up
 * @returns Cached image element or undefined if not found
 */
export function getCachedPixelatedImage(
  dataUrl: string,
): HTMLImageElement | undefined {
  return pixelatedImageCache.get(dataUrl);
}

/**
 * Clears the pixelated image cache.
 *
 * Useful for memory management when cache grows too large.
 */
export function clearPixelatedImageCache(): void {
  pixelatedImageCache.clear();
}

/**
 * Gets the current size of the pixelated image cache.
 *
 * @returns Number of cached images
 */
export function getPixelatedImageCacheSize(): number {
  return pixelatedImageCache.size;
}
