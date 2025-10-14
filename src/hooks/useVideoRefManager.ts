/**
 * Hook for managing video element references
 *
 * @module hooks/useVideoRefManager
 */

import { useCallback, useRef } from "react";

/**
 * Hook that manages a map of video element references
 *
 * @returns Ref map and callback to create ref handlers
 */
export function useVideoRefManager() {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Creates a ref callback for a specific video ID
   */
  const createRefCallback = useCallback((videoId: string) => {
    return (el: HTMLVideoElement | null) => {
      if (el) {
        videoRefs.current.set(videoId, el);
      } else {
        videoRefs.current.delete(videoId);
      }
    };
  }, []);

  return { createRefCallback, videoRefs };
}
