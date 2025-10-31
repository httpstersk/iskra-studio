/**
 * Video controls wrapper component - positions and displays video controls
 *
 * @module components/canvas/video-overlays/VideoControlsWrapper
 */

import {
  PLAY_INDICATOR_OFFSET,
  VIDEO_CONTROLS_LAYOUT,
  VIDEO_CONTROLS_OFFSET,
  VIDEO_CONTROLS_TRANSITION,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import { useVideoPositioning } from "@/hooks/useVideoPositioning";
import type { PlacedVideo } from "@/types/canvas";
import React, { useMemo } from "react";
import { VideoControls } from "../video-controls";

/**
 * Viewport configuration for positioning calculations
 */
interface Viewport {
  /** Zoom scale factor */
  scale: number;
  /** Horizontal offset */
  x: number;
  /** Vertical offset */
  y: number;
}

/**
 * Props for the VideoControlsWrapper component
 */
interface VideoControlsWrapperProps {
  /** Whether controls should be hidden */
  isHidden: boolean;
  /** Callback when video properties change */
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  /** Video data */
  video: PlacedVideo;
  /** Current viewport state */
  viewport: Viewport;
}

/**
 * VideoControlsWrapper component - positions controls as overlay at bottom of video
 *
 * @param props - Component props
 * @returns Wrapper element with positioned video controls
 */
export const VideoControlsWrapper = React.memo<VideoControlsWrapperProps>(
  function VideoControlsWrapper({ isHidden, onChange, video, viewport }) {
    const position = useVideoPositioning(
      video,
      viewport,
      VIDEO_CONTROLS_OFFSET,
      PLAY_INDICATOR_OFFSET
    );

    const wrapperStyle = useMemo(
      () => ({
        alignItems: "flex-end",
        display: "flex",
        height: position.height,
        left: position.left,
        opacity: isHidden ? 0 : 1,
        padding: 0,
        pointerEvents: "none" as const,
        position: "absolute" as const,
        top: position.top,
        transition: VIDEO_CONTROLS_TRANSITION,
        width: position.width,
        zIndex: VIDEO_OVERLAY_Z_INDEX,
      }),
      [isHidden, position.height, position.left, position.top, position.width]
    );

    return (
      <div style={wrapperStyle}>
        <VideoControls
          className="pointer-events-auto"
          onChange={onChange}
          video={video}
        />
      </div>
    );
  }
);
