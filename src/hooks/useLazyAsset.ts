/**
 * Hook for lazy-loading full-size assets on demand.
 *
 * Uses thumbnails by default and loads full-size assets only when needed
 * (e.g., when user interacts with the asset or requests full-res preview).
 * Implements request deduplication to prevent multiple concurrent fetches.
 */

import { useCallback, useRef, useState } from "react";

interface LazyAssetState {
  url?: string;
  isLoading: boolean;
  error?: string;
}

const urlCache = new Map<string, Promise<string>>();

/**
 * Hook for lazy-loading full-size asset URLs.
 *
 * Fetches full-size asset URL from Convex storage only when requested.
 * Caches results to avoid repeated fetches for the same asset.
 *
 * @param thumbnailUrl - Thumbnail URL to display by default
 * @param storageId - Convex storage ID for fetching full-size
 * @returns Asset state with URL, loading state, and error handling
 *
 * @example
 * ```tsx
 * function ImageElement({ thumbnailUrl, storageId }) {
 *   const { url, isLoading } = useLazyAsset(thumbnailUrl, storageId);
 *
 *   return (
 *     <img
 *       src={url || thumbnailUrl}
 *       onMouseEnter={() => loadFullSize()}
 *     />
 *   );
 * }
 * ```
 */
export function useLazyAsset(
  thumbnailUrl: string | undefined,
  storageId: string | undefined,
): LazyAssetState & { loadFullSize: () => Promise<void> } {
  const [state, setState] = useState<LazyAssetState>({
    url: undefined,
    isLoading: false,
  });

  const loadingRef = useRef(false);

  const loadFullSize = useCallback(async () => {
    // Don't load if already loaded
    if (state.url) return;

    // Don't load if no storageId
    if (!storageId) return;

    // Prevent concurrent requests
    if (loadingRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    loadingRef.current = true;

    try {
      // Check cache first
      let urlPromise = urlCache.get(storageId);

      // If not in cache, fetch it using the proxy
      if (!urlPromise) {
        // Just return the proxy URL directly
        // The proxy endpoint will fetch from Convex and add CORS headers
        urlPromise = Promise.resolve(
          `/api/storage/proxy?storageId=${encodeURIComponent(storageId)}`,
        );

        urlCache.set(storageId, urlPromise);
      }

      const url = await urlPromise;
      setState({ url, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setState({
        url: undefined,
        isLoading: false,
        error: errorMessage,
      });
      urlCache.delete(storageId);
    } finally {
      loadingRef.current = false;
    }
  }, [storageId, state.url]);

  return {
    ...state,
    loadFullSize,
  };
}
