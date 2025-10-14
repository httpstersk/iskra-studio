/**
 * Video controls wrapper component - positions and displays video controls
 *
 * @module components/canvas/video-overlays/VideoControlsWrapper
 */

import {
  PLAY_INDICATOR_OFFSET,
  VIDEO_CONTROLS_MIN_WIDTH,
  VIDEO_CONTROLS_OFFSET,
  VIDEO_CONTROLS_TRANSITION,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import { useVideoPositioning } from "@/hooks/useVideoPositioning";
import type { PlacedVideo } from "@/types/canvas";
import React, { useMemo } from "react";
import { VideoControls } from "../VideoControls";

/**
 * Props for the VideoControlsWrapper component
 */
interface VideoControlsWrapperProps {
  isHidden: boolean;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  video: PlacedVideo;
  viewport: {
    scale: number;
    x: number;
    y: number;
  };
}

/**
 * VideoControlsWrapper component - positions controls below the video
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
        left: position.left,
        opacity: isHidden ? 0 : 1,
        position: "absolute" as const,
        top: position.controlsTop,
        transition: VIDEO_CONTROLS_TRANSITION,
        width: Math.max(position.width, VIDEO_CONTROLS_MIN_WIDTH),
        zIndex: VIDEO_OVERLAY_Z_INDEX,
      }),
      [isHidden, position.controlsTop, position.left, position.width]
    );

    return (
      <div style={wrapperStyle}>
        <VideoControls className="mt-2" onChange={onChange} video={video} />
      </div>
    );
  }
);
