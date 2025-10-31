/**
 * Video play indicator component - shows play button overlay when video is paused
 *
 * @module components/canvas/video-overlays/VideoPlayIndicator
 */

import {
  VIDEO_CONTROLS_OFFSET,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import { useVideoPositioning } from "@/hooks/useVideoPositioning";
import type { PlacedVideo } from "@/types/canvas";
import { Play } from "lucide-react";
import React from "react";

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
 * Maximum padding applied to the play indicator wrapper
 */
const ICON_MAX_PADDING = 24;

/**
 * Maximum icon size in pixels
 */
const ICON_MAX_SIZE = 96;

/**
 * Minimum padding applied to the play indicator wrapper
 */
const ICON_MIN_PADDING = 6;

/**
 * Minimum icon size in pixels
 */
const ICON_MIN_SIZE = 24;

/**
 * Ratio of min(video dimension) used to calculate wrapper padding
 */
const ICON_PADDING_RATIO = 0.12;

/**
 * Ratio of min(video dimension) used to calculate icon size
 */
const ICON_SIZE_RATIO = 0.36;

/**
 * Tailwind classes applied to the play indicator container
 */
const INDICATOR_CONTAINER_CLASSNAME =
  "absolute flex items-center justify-center pointer-events-none transition-opacity duration-200";

/**
 * Tailwind classes applied to the play icon wrapper
 */
const INDICATOR_WRAPPER_CLASSNAME =
  "flex items-center justify-center rounded-full bg-black/50";

/**
 * Tailwind classes applied to the play icon element
 */
const PLAY_ICON_CLASSNAME = "fill-white text-white";

/**
 * Stroke width applied to the play icon
 */
const PLAY_ICON_STROKE_WIDTH = 1.5;

/**
 * Hidden visibility state value
 */
const VISIBILITY_HIDDEN = "hidden" as const;

/**
 * Visible visibility state value
 */
const VISIBILITY_VISIBLE = "visible" as const;

/**
 * Calculates icon size for play indicator based on scaled video dimension
 * Uses proportional sizing with min/max bounds for consistent visibility
 */
function calculatePlayIndicatorIconSize(minDimension: number): number {
  return Math.max(
    ICON_MIN_SIZE,
    Math.min(ICON_MAX_SIZE, minDimension * ICON_SIZE_RATIO)
  );
}

/**
 * Calculates padding for play indicator wrapper based on scaled video dimension
 * Ensures proportional spacing around the icon within min/max bounds
 */
function calculatePlayIndicatorPadding(minDimension: number): number {
  return Math.max(
    ICON_MIN_PADDING,
    Math.min(ICON_MAX_PADDING, minDimension * ICON_PADDING_RATIO)
  );
}

/**
 * VideoPlayIndicator component - displays play button when video is paused
 */
export const VideoPlayIndicator = React.memo<VideoPlayIndicatorProps>(
  function VideoPlayIndicator({ isHidden, video, viewport }) {
    const position = useVideoPositioning(
      video,
      viewport,
      VIDEO_CONTROLS_OFFSET
    );

    if (video.isPlaying || !video.isLoaded) {
      return null;
    }

    const scaledMinDimension = Math.min(position.width, position.height);
    const iconSize = calculatePlayIndicatorIconSize(scaledMinDimension);
    const wrapperPadding = calculatePlayIndicatorPadding(scaledMinDimension);
    const visibility = video.isLoaded ? VISIBILITY_VISIBLE : VISIBILITY_HIDDEN;

    return (
      <div
        className={INDICATOR_CONTAINER_CLASSNAME}
        style={{
          height: position.height,
          left: position.left,
          opacity: isHidden ? 0 : 1,
          top: position.top,
          transform: `rotate(${video.rotation || 0}deg)`,
          transformOrigin: "center",
          visibility,
          width: position.width,
          zIndex: VIDEO_OVERLAY_Z_INDEX,
        }}
      >
        <div
          className={INDICATOR_WRAPPER_CLASSNAME}
          style={{ padding: wrapperPadding }}
        >
          <Play
            className={PLAY_ICON_CLASSNAME}
            size={iconSize}
            strokeWidth={PLAY_ICON_STROKE_WIDTH}
          />
        </div>
      </div>
    );
  }
);
