/**
 * Global image cache to prevent duplicate network requests
 * Images are cached by URL and reused across all components
 */

import { useEffect, useState, useRef } from "react";

// Global cache shared across all component instances
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

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
      console.log("[ImageCache] Image loaded successfully:", src);
      imageCache.set(src, img);
      loadingPromises.delete(src);
      resolve(img);
    };

    img.onerror = (error) => {
      console.error("[ImageCache] Image load error for:", src, {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
        currentSrc: img.currentSrc,
        error: error,
      });
      loadingPromises.delete(src);
      reject(new Error(`Failed to load image from ${src}`));
    };

    console.log("[ImageCache] Starting to load image:", src);
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
      .catch((error) => {
        console.error(`Failed to load image: ${src}`, error);
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
}

/**
 * Remove a specific image from the cache
 */
export function removeFromCache(src: string) {
  imageCache.delete(src);
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats() {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
  };
}
