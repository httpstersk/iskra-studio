import {
  TIME_DISPLAY_STYLES,
  TIMELINE_STYLES,
  VIDEO_CONTROLS_ARIA,
} from "@/constants/video-overlays";
import React from "react";
import { SeekBar } from "./SeekBar";
import { TimeDisplay } from "./TimeDisplay";

/**
 * Props for the Timeline component
 */
interface TimelineProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when seek position changes */
  onSeek: (time: number) => void;
}

/**
 * Timeline component - combines seek bar and time display
 *
 * @param props - Component props
 * @returns Timeline element
 */
export const Timeline = React.memo<TimelineProps>(function Timeline({
  currentTime,
  duration,
  onSeek,
}) {
  const containerClassName = [
    TIMELINE_STYLES.FLEX,
    "flex",
    "flex-col",
    TIME_DISPLAY_STYLES.GAP,
  ].join(" ");

  return (
    <div aria-label={VIDEO_CONTROLS_ARIA.TIMELINE_CONTAINER} className={containerClassName}>
      <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
      <TimeDisplay currentTime={currentTime} duration={duration} />
    </div>
  );
});
