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
export interface VideoPosition {
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
    const scaledWidth = video.width * viewport.scale;
    const scaledHeight = video.height * viewport.scale;

    // Calculate center point in canvas coordinates
    const centerX = video.x + video.width / 2;
    const centerY = video.y + video.height / 2;

    // Transform center to screen coordinates
    const screenCenterX = centerX * viewport.scale + viewport.x;
    const screenCenterY = centerY * viewport.scale + viewport.y;

    // Calculate top-left position for CSS (element rotates around its center)
    const scaledX = screenCenterX - scaledWidth / 2;
    const scaledY = screenCenterY - scaledHeight / 2;

    return {
      controlsTop:
        (video.y + video.height) * viewport.scale + viewport.y + controlsOffset,
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
