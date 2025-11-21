"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global cache for streaming images to prevent duplicate network requests.
 * Images are cached by URL and reused across all components.
 *
 * Features:
 * - LRU eviction to prevent memory bloat
 * - Configurable max cache size
 * - Access tracking for efficient eviction
 */

// LRU cache configuration
const MAX_STREAMING_CACHE_SIZE = 100; // Maximum number of streaming images to keep

const streamingImageCache = new Map<string, HTMLImageElement>();
const streamingLoadingPromises = new Map<string, Promise<HTMLImageElement>>();
// Track access order for LRU eviction (most recent at end)
const streamingAccessOrder: string[] = [];

/**
 * Update access order for LRU tracking
 */
function touchStreamingLRU(src: string) {
  const index = streamingAccessOrder.indexOf(src);
  if (index !== -1) {
    streamingAccessOrder.splice(index, 1);
  }
  streamingAccessOrder.push(src);
}

/**
 * Evict oldest entries if cache exceeds max size
 */
function evictStreamingIfNeeded() {
  while (streamingAccessOrder.length > MAX_STREAMING_CACHE_SIZE) {
    const oldest = streamingAccessOrder.shift();
    if (oldest) {
      streamingImageCache.delete(oldest);
    }
  }
}

/**
 * Custom hook for streaming images that prevents flickering and caches loaded images.
 *
 * @param src - Image source URL
 * @returns [image | undefined, isLoading]
 */
export const useStreamingImage = (src: string) => {
  const [currentImage, setCurrentImage] = useState<
    HTMLImageElement | undefined
  >(() => {
    // Check cache immediately for synchronous return
    return streamingImageCache.get(src);
  });
  const [isLoading, setIsLoading] = useState(() => {
    return src && !streamingImageCache.has(src);
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!src) {
      setCurrentImage(undefined);
      setIsLoading(false);
      return;
    }

    // If already in cache, set immediately
    if (streamingImageCache.has(src)) {
      touchStreamingLRU(src); // Update LRU access order
      setCurrentImage(streamingImageCache.get(src));
      setIsLoading(false);
      return;
    }

    // If already loading, wait for existing promise
    if (streamingLoadingPromises.has(src)) {
      streamingLoadingPromises
        .get(src)!
        .then((img) => {
          if (isMountedRef.current) {
            setCurrentImage(img);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        });
      return;
    }

    // Start loading the image
    setIsLoading(true);

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        streamingImageCache.set(src, img);
        touchStreamingLRU(src); // Add to LRU tracking
        evictStreamingIfNeeded(); // Evict old entries if needed
        streamingLoadingPromises.delete(src);
        resolve(img);
      };

      img.onerror = () => {
        streamingLoadingPromises.delete(src);
        reject(new Error(`Failed to load streaming image from ${src}`));
      };

      img.src = src;
    });

    streamingLoadingPromises.set(src, promise);

    promise
      .then((img) => {
        if (isMountedRef.current) {
          setCurrentImage(img);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, [src]);

  return [currentImage, isLoading] as const;
};
