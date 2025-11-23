/**
 * Global image cache to prevent duplicate network requests
 * Images are cached by URL and reused across all components
 *
 * Features:
 * - LRU eviction to prevent memory bloat
 * - Configurable max cache size
 * - Access tracking for efficient eviction
 */

import { useEffect, useRef, useState } from "react";

// LRU cache configuration
const MAX_CACHE_SIZE = 150; // Maximum number of images to keep in cache

// Global cache shared across all component instances
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();
// Track access order for LRU eviction (most recent at end)
const accessOrder: string[] = [];

// Secondary index: imageId → src for quick cache lookups without hitting IndexedDB
// This allows us to check if an image is cached by ID (used when switching projects)
const imageSrcById = new Map<string, string>();

/**
 * Update access order for LRU tracking
 * Moves the accessed key to the end (most recently used)
 */
function touchLRU(src: string) {
  const index = accessOrder.indexOf(src);
  if (index !== -1) {
    accessOrder.splice(index, 1);
  }
  accessOrder.push(src);
}

/**
 * Evict oldest entries if cache exceeds max size
 */
function evictIfNeeded() {
  while (accessOrder.length > MAX_CACHE_SIZE) {
    const oldest = accessOrder.shift();
    if (oldest) {
      imageCache.delete(oldest);
    }
  }
}

/**
 * Load an image with caching to prevent duplicate network requests
 * @param src - Image source URL
 * @param crossOrigin - CORS mode (default: "anonymous")
 * @returns Promise that resolves with the loaded image element
 */
function loadImage(
  src: string,
  crossOrigin: string = "anonymous"
): Promise<HTMLImageElement> {
  // Return cached image if available
  if (imageCache.has(src)) {
    touchLRU(src); // Update access order
    return Promise.resolve(imageCache.get(src)!);
  }

  // Return existing loading promise if already loading
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }

  // Start loading the image
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = crossOrigin;

    img.onload = () => {
      imageCache.set(src, img);
      touchLRU(src); // Add to LRU tracking
      evictIfNeeded(); // Evict old entries if needed
      loadingPromises.delete(src);
      resolve(img);
    };

    img.onerror = (_error) => {
      loadingPromises.delete(src);
      reject(new Error(`Failed to load image from ${src}`));
    };

    img.src = src;
  });

  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Hook to load and cache images, preventing duplicate network requests
 * Much more efficient than use-image library for our use case
 *
 * @param src - Image source URL
 * @param crossOrigin - CORS mode (default: "anonymous")
 * @returns [image | undefined, status: "loading" | "loaded" | "error"]
 */
export function useImageCache(
  src: string,
  crossOrigin: string = "anonymous"
): [HTMLImageElement | undefined, "loading" | "loaded" | "error"] {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => {
    // Check cache immediately for synchronous return
    return imageCache.get(src);
  });
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(() => {
    return imageCache.has(src) ? "loaded" : "loading";
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!src) {
      setImage(undefined);
      setStatus("error");
      return;
    }

    // If already in cache, set immediately
    if (imageCache.has(src)) {
      touchLRU(src); // Update LRU access order
      setImage(imageCache.get(src));
      setStatus("loaded");
      return;
    }

    // Load the image
    setStatus("loading");
    loadImage(src, crossOrigin)
      .then((img) => {
        if (isMountedRef.current) {
          setImage(img);
          setStatus("loaded");
        }
      })
      .catch((_error) => {
        if (isMountedRef.current) {
          setImage(undefined);
          setStatus("error");
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [src, crossOrigin]);

  return [image, status];
}

/**
 * Clear the entire image cache (useful for testing or memory management)
 */
export function clearImageCache() {
  imageCache.clear();
  loadingPromises.clear();
  accessOrder.length = 0;
  imageSrcById.clear();
}

/**
 * Remove a specific image from the cache
 */
export function removeFromCache(src: string) {
  imageCache.delete(src);
  const index = accessOrder.indexOf(src);
  if (index !== -1) {
    accessOrder.splice(index, 1);
  }
  // Also remove from secondary index
  imageSrcById.forEach((cachedSrc, imageId) => {
    if (cachedSrc === src) {
      imageSrcById.delete(imageId);
    }
  });
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
    lruOrder: accessOrder.length,
    maxCacheSize: MAX_CACHE_SIZE,
  };
}

/**
 * Register an imageId → src mapping for quick cache lookups.
 * Called when loading images from IndexedDB to enable instant cache checks
 * when switching back to a previously viewed project.
 *
 * @param imageId - The unique image ID (from PlacedImage.id)
 * @param src - The image source URL (data URL or remote URL)
 */
export function registerImageSrc(imageId: string, src: string) {
  // Only register non-empty src values
  if (src) {
    imageSrcById.set(imageId, src);
  }
}

/**
 * Get the cached src for an imageId if it exists and the image is in cache.
 * Returns the src if both conditions are met, undefined otherwise.
 *
 * This allows skipping skeleton placeholders when switching back to a project
 * whose images are already loaded in memory.
 *
 * @param imageId - The unique image ID to look up
 * @returns The cached src if available and in cache, undefined otherwise
 */
export function getCachedImageSrcById(imageId: string): string | undefined {
  const src = imageSrcById.get(imageId);
  if (src && imageCache.has(src)) {
    touchLRU(src);
    return src;
  }
  return undefined;
}

/**
 * Check if an image is cached by its ID.
 * Quick check without returning the src.
 *
 * @param imageId - The unique image ID to check
 * @returns true if the image is in cache, false otherwise
 */
export function isImageCachedById(imageId: string): boolean {
  const src = imageSrcById.get(imageId);
  return !!src && imageCache.has(src);
}

/**
 * Check if a src URL is currently in the cache.
 *
 * @param src - The image source URL to check
 * @returns true if the src is in cache, false otherwise
 */
export function isImageCached(src: string): boolean {
  return imageCache.has(src);
}
