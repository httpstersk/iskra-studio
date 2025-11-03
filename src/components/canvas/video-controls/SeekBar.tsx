import {
  TIMELINE_STYLES,
  VIDEO_CONTROLS_ARIA,
} from "@/constants/video-overlays";
import React, { useCallback, useRef } from "react";

/**
 * Keyboard navigation constants
 */
const KEYBOARD_SEEK = {
  LARGE_STEP: 10,
  SMALL_STEP: 5,
} as const;

/**
 * Props for the SeekBar component
 */
interface SeekBarProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Callback when seek position changes */
  onSeek: (time: number) => void;
}

/**
 * Calculates the time position from a mouse event on the seek bar
 *
 * @param event - Mouse event
 * @param element - Seek bar element
 * @param duration - Total duration in seconds
 * @returns Calculated time in seconds, or null if calculation fails
 */
function calculateTimeFromEvent(
  event: React.MouseEvent<HTMLDivElement>,
  element: HTMLDivElement,
  duration: number,
): number | null {
  const rect = element.getBoundingClientRect();
  const position = (event.clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(position * duration, duration));
}

/**
 * SeekBar component - draggable timeline for video seeking
 *
 * @param props - Component props
 * @returns Seek bar element
 */
export const SeekBar = React.memo<SeekBarProps>(function SeekBar({
  currentTime,
  duration,
  onSeek,
}) {
  const isDraggingRef = useRef(false);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!seekBarRef.current) return;

      const time = calculateTimeFromEvent(event, seekBarRef.current, duration);
      if (time !== null) {
        onSeek(time);
      }
    },
    [duration, onSeek],
  );

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !seekBarRef.current) return;

      const time = calculateTimeFromEvent(event, seekBarRef.current, duration);
      if (time !== null) {
        onSeek(time);
      }
    },
    [duration, onSeek],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let newTime: number | null = null;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          newTime = Math.max(0, currentTime - KEYBOARD_SEEK.SMALL_STEP);
          break;
        case "ArrowRight":
          event.preventDefault();
          newTime = Math.min(duration, currentTime + KEYBOARD_SEEK.SMALL_STEP);
          break;
        case "Home":
          event.preventDefault();
          newTime = 0;
          break;
        case "End":
          event.preventDefault();
          newTime = duration;
          break;
        case "PageUp":
          event.preventDefault();
          newTime = Math.max(0, currentTime - KEYBOARD_SEEK.LARGE_STEP);
          break;
        case "PageDown":
          event.preventDefault();
          newTime = Math.min(duration, currentTime + KEYBOARD_SEEK.LARGE_STEP);
          break;
      }

      if (newTime !== null) {
        onSeek(newTime);
      }
    },
    [currentTime, duration, onSeek],
  );

  const progressPercentage = (currentTime / duration) * 100;

  const containerClassName = [
    TIMELINE_STYLES.POSITION,
    TIMELINE_STYLES.HEIGHT,
    TIMELINE_STYLES.BACKGROUND,
    TIMELINE_STYLES.BORDER_RADIUS,
    TIMELINE_STYLES.CURSOR,
    TIMELINE_STYLES.HEIGHT_HOVER,
    TIMELINE_STYLES.TRANSITION,
  ].join(" ");

  const progressClassName = [
    "absolute",
    "top-0",
    "left-0",
    "h-full",
    TIMELINE_STYLES.BACKGROUND_PROGRESS,
    TIMELINE_STYLES.BORDER_RADIUS,
  ].join(" ");

  return (
    <div
      aria-label={VIDEO_CONTROLS_ARIA.SEEK_BAR}
      aria-valuemax={duration}
      aria-valuemin={0}
      aria-valuenow={currentTime}
      className={containerClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      ref={seekBarRef}
      role="slider"
      tabIndex={0}
    >
      <div
        className={progressClassName}
        style={{ width: `${progressPercentage}%` }}
      />
    </div>
  );
});
