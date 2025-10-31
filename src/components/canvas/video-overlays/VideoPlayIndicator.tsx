/**
 * Video play indicator component - shows play button overlay when video is paused
 *
 * @module components/canvas/video-overlays/VideoPlayIndicator
 */

import {
  PLAY_INDICATOR_FONT_SIZE,
  PLAY_INDICATOR_OFFSET,
  VIDEO_CONTROLS_OFFSET,
  VIDEO_CONTROLS_TRANSITION,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import { useVideoPositioning } from "@/hooks/useVideoPositioning";
import type { PlacedVideo } from "@/types/canvas";
import React, { useMemo } from "react";

/**
 * Props for the VideoPlayIndicator component
 */
interface VideoPlayIndicatorProps {
  isHidden: boolean;
  video: PlacedVideo;
  viewport: {
    scale: number;
    x: number;
    y: number;
  };
}

/**
 * Calculates font size for play indicator based on viewport scale
 * Uses non-linear scaling with min/max bounds for better visibility
 */
function calculatePlayIndicatorFontSize(scale: number): number {
  const { MAX, MIN, SCALE_FACTOR } = PLAY_INDICATOR_FONT_SIZE;
  return Math.max(MIN, Math.min(MAX, SCALE_FACTOR * Math.sqrt(scale)));
}

/**
 * VideoPlayIndicator component - displays play button when video is paused
 */
export const VideoPlayIndicator = React.memo<VideoPlayIndicatorProps>(
  function VideoPlayIndicator({ isHidden, video, viewport }) {
    const position = useVideoPositioning(
      video,
      viewport,
      VIDEO_CONTROLS_OFFSET,
      PLAY_INDICATOR_OFFSET
    );

    const indicatorStyle = useMemo(() => {
      const visibility = video.isLoaded
        ? ("visible" as const)
        : ("hidden" as const);
      const display = video.isLoaded ? "block" : "none";

      return {
        display,
        fontSize: `${calculatePlayIndicatorFontSize(viewport.scale)}px`,
        left: position.playIndicatorLeft,
        opacity: isHidden ? 0 : 1,
        pointerEvents: "none" as const,
        position: "absolute" as const,
        top: position.playIndicatorTop,
        transition: VIDEO_CONTROLS_TRANSITION,
        visibility,
        zIndex: VIDEO_OVERLAY_Z_INDEX,
      };
    }, [
      isHidden,
      position.playIndicatorLeft,
      position.playIndicatorTop,
      video.isLoaded,
      viewport.scale,
    ]);

    if (video.isPlaying || !video.isLoaded) {
      return null;
    }

    return (
      <div
        className="absolute bg-none text-white px-1 py-0.5"
        style={indicatorStyle}
      >
        ▶
      </div>
    );
  }
);
