/**
 * Video controls component - compound component for video playback controls
 *
 * @module components/canvas/video-controls
 */

import {
  VIDEO_CONTROLS_ARIA,
  VIDEO_CONTROLS_STYLES,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import type { PlacedVideo } from "@/types/canvas";
import { seekVideo, toggleVideoPlayback } from "@/utils/video-element-dom";
import React, { useCallback } from "react";
import { PlayButton } from "./PlayButton";
import { Timeline } from "./Timeline";

/**
 * Props for the VideoControls component
 */
interface VideoControlsProps {
  /** Additional CSS classes */
  className?: string;
  /** Callback when video properties change */
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  /** Video data */
  video: PlacedVideo;
}

/**
 * VideoControls component - main controls for video playback with accessibility
 *
 * Uses compound component pattern with PlayButton and Timeline subcomponents.
 * Minimizes local state by deriving currentTime from props and using refs for drag state.
 *
 * @param props - Component props
 * @returns Video controls element
 */
export const VideoControls = React.memo<VideoControlsProps>(
  function VideoControls({ className = "", onChange, video }) {
    const handlePlayToggle = useCallback(() => {
      const newPlayState = !video.isPlaying;
      void toggleVideoPlayback(video.id, newPlayState);
      onChange({ isPlaying: newPlayState });
    }, [onChange, video.id, video.isPlaying]);

    const handleSeek = useCallback(
      (time: number) => {
        seekVideo(video.id, time);
        onChange({ currentTime: time });
      },
      [onChange, video.id]
    );

    const handleClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
    }, []);

    const containerClassName = [
      "flex",
      "items-center",
      VIDEO_CONTROLS_STYLES.GAP,
      VIDEO_CONTROLS_STYLES.BACKGROUND,
      VIDEO_CONTROLS_STYLES.BLUR,
      VIDEO_CONTROLS_STYLES.BORDER_RADIUS,
      VIDEO_CONTROLS_STYLES.PADDING_X,
      VIDEO_CONTROLS_STYLES.PADDING_Y,
      `z-[${VIDEO_OVERLAY_Z_INDEX}]`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        aria-label={VIDEO_CONTROLS_ARIA.CONTROLS_CONTAINER}
        className={containerClassName}
        onClick={handleClick}
        role="toolbar"
      >
        <PlayButton isPlaying={video.isPlaying} onToggle={handlePlayToggle} />
        <Timeline
          currentTime={video.currentTime}
          duration={video.duration}
          onSeek={handleSeek}
        />
      </div>
    );
  }
);

VideoControls.displayName = "VideoControls";

export { PlayButton } from "./PlayButton";
export { SeekBar } from "./SeekBar";
export { TimeDisplay } from "./TimeDisplay";
export { Timeline } from "./Timeline";
