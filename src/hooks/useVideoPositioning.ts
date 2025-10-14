/**
 * Hook for calculating video positioning and dimensions
 *
 * @module hooks/useVideoPositioning
 */

import type { PlacedVideo } from "@/types/canvas";
import { useMemo } from "react";

/**
 * Viewport configuration
 */
interface Viewport {
  scale: number;
  x: number;
  y: number;
}

/**
 * Calculated video positions
 */
interface VideoPosition {
  controlsTop: number;
  height: number;
  left: number;
  playIndicatorLeft: number;
  playIndicatorTop: number;
  top: number;
  width: number;
}

/**
 * Calculates all positioning values for a video element
 *
 * @param video - The video element to position
 * @param viewport - Current viewport state
 * @param controlsOffset - Offset for controls below video
 * @param playIndicatorOffset - Offset for play indicator from corner
 * @returns Calculated positions and dimensions
 */
export function useVideoPositioning(
  video: PlacedVideo,
  viewport: Viewport,
  controlsOffset: number = 10,
  playIndicatorOffset: number = 5
): VideoPosition {
  return useMemo(() => {
    const scaledX = video.x * viewport.scale + viewport.x;
    const scaledY = video.y * viewport.scale + viewport.y;
    const scaledWidth = video.width * viewport.scale;
    const scaledHeight = video.height * viewport.scale;

    return {
      controlsTop: (video.y + video.height) * viewport.scale + viewport.y + controlsOffset,
      height: scaledHeight,
      left: scaledX,
      playIndicatorLeft: scaledX + playIndicatorOffset * viewport.scale,
      playIndicatorTop: scaledY + playIndicatorOffset * viewport.scale,
      top: scaledY,
      width: scaledWidth,
    };
  }, [
    video.x,
    video.y,
    video.width,
    video.height,
    viewport.scale,
    viewport.x,
    viewport.y,
    controlsOffset,
    playIndicatorOffset,
  ]);
}
