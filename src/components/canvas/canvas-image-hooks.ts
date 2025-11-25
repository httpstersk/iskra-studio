/**
 * Custom hooks for CanvasImage component
 *
 * These hooks handle image loading, overlay management, and frame throttling
 * for optimal canvas performance.
 *
 * @module components/canvas/canvas-image-hooks
 */

import { useImageCache } from "@/hooks/useImageCache";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import { getCachedPixelatedImage } from "@/utils/image-cache";
import { useCallback, useRef } from "react";

/**
 * Constant for CORS image loading
 */
const CORS_MODE = "anonymous" as const;

/**
 * Custom hook to get the appropriate image source with thumbnail fallback.
 *
 * Loading priority:
 * 1. If displayAsThumbnail is true: only load and return thumbnail
 * 2. Otherwise: Thumbnail (if available) displays first, then switches to full-size
 * 3. For generated images, uses streaming for progressive updates
 *
 * @param src - Full-size image source URL
 * @param thumbnailSrc - Optional thumbnail URL (shown first)
 * @param isGenerated - Whether the image was AI-generated
 * @param displayAsThumbnail - If true, only show thumbnail without loading full-size
 * @returns Loaded image element or undefined (thumbnail first, then full-size)
 */
export const useCanvasImageSource = (
  src: string,
  thumbnailSrc: string | undefined,
  isGenerated: boolean,
  displayAsThumbnail: boolean,
) => {
  // When displayAsThumbnail is true, ONLY load thumbnail, never load src
  // This prevents loading full-size images when we only want thumbnails
  const effectiveSrc = displayAsThumbnail && thumbnailSrc ? thumbnailSrc : src;

  // Load thumbnail if available
  const [thumbnailImg] = useImageCache(thumbnailSrc || "", CORS_MODE);

  // Only load full-size if NOT displaying as thumbnail
  const shouldLoadFullSize = !displayAsThumbnail;

  // Load full-size image (only if shouldLoadFullSize is true)
  const [streamingImg] = useStreamingImage(
    isGenerated && shouldLoadFullSize ? effectiveSrc : "",
  );
  const [cachedImg] = useImageCache(
    !isGenerated && shouldLoadFullSize ? effectiveSrc : "",
    CORS_MODE,
  );

  // Full-size image (once loaded, switch from thumbnail)
  const fullSizeImg = isGenerated ? streamingImg : cachedImg;

  // Priority:
  // - If displayAsThumbnail: only show thumbnail
  // - Otherwise: full-size image > thumbnail > nothing
  if (displayAsThumbnail) {
    return thumbnailImg;
  }
  return fullSizeImg || thumbnailImg;
};

/**
 * Custom hook to load pixelated overlay image if available.
 * Checks cache first for immediate rendering, then falls back to loading.
 *
 * @param pixelatedSrc - Optional pixelated overlay source URL
 * @returns Loaded pixelated image element or undefined
 */
export const usePixelatedOverlay = (pixelatedSrc: string | undefined) => {
  const cachedImage = pixelatedSrc
    ? getCachedPixelatedImage(pixelatedSrc)
    : undefined;

  const [loadedImg] = useImageCache(
    pixelatedSrc && !cachedImage ? pixelatedSrc : "",
    CORS_MODE,
  );

  if (!pixelatedSrc) return undefined;
  // Return cached image immediately if available, otherwise use loaded image
  return cachedImage || loadedImg;
};

/**
 * Custom hook to throttle updates to 60fps for optimal performance.
 * Returns a function that checks if enough time has passed since last update.
 *
 * @param limitMs - Minimum milliseconds between updates (default: 16ms for ~60fps)
 * @returns Function that returns true if update should proceed
 */
export const useFrameThrottle = (limitMs = 16) => {
  const lastRef = useRef(0);

  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < limitMs) {
      return false;
    }
    lastRef.current = now;
    return true;
  }, [limitMs]);
};
