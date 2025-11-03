import { TIME_DISPLAY_STYLES, TIME_FORMAT } from "@/constants/video-overlays";
import React from "react";

/**
 * Props for the TimeDisplay component
 */
interface TimeDisplayProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
}

/**
 * Formats time in seconds to MM:SS format
 *
 * @param seconds - Time in seconds to format
 * @returns Formatted time string (MM:SS)
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / TIME_FORMAT.SECONDS_PER_MINUTE);
  const secs = Math.floor(seconds % TIME_FORMAT.SECONDS_PER_MINUTE);
  return `${mins.toString().padStart(TIME_FORMAT.MIN_DIGITS, TIME_FORMAT.PADDING_CHAR)}${TIME_FORMAT.SEPARATOR}${secs.toString().padStart(TIME_FORMAT.MIN_DIGITS, TIME_FORMAT.PADDING_CHAR)}`;
}

/**
 * TimeDisplay component - shows current time and total duration
 *
 * @param props - Component props
 * @returns Time display element
 */
export const TimeDisplay = React.memo<TimeDisplayProps>(function TimeDisplay({
  currentTime,
  duration,
}) {
  const containerClassName = [
    "flex",
    TIME_DISPLAY_STYLES.JUSTIFY,
    TIME_DISPLAY_STYLES.FONT_SIZE,
    TIME_DISPLAY_STYLES.TEXT_COLOR,
    TIME_DISPLAY_STYLES.PADDING_X,
  ].join(" ");

  return (
    <div className={containerClassName}>
      <span aria-label="Current time">{formatTime(currentTime)}</span>
      <span aria-label="Total duration">{formatTime(duration)}</span>
    </div>
  );
});
