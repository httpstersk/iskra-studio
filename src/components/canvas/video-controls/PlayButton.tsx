import { Button } from "@/components/ui/button";
import {
  PLAY_BUTTON_STYLES,
  VIDEO_CONTROLS_ARIA,
} from "@/constants/video-overlays";
import { Pause, Play } from "lucide-react";
import React from "react";

/**
 * Props for the PlayButton component
 */
interface PlayButtonProps {
  /** Whether the video is currently playing */
  isPlaying: boolean;
  /** Callback when play/pause button is clicked */
  onToggle: () => void;
}

/**
 * PlayButton component - renders a play/pause toggle button with accessibility support
 *
 * @param props - Component props
 * @returns Play/pause button element
 */
export const PlayButton = React.memo<PlayButtonProps>(function PlayButton({
  isPlaying,
  onToggle,
}) {
  const ariaLabel = isPlaying
    ? VIDEO_CONTROLS_ARIA.PAUSE_BUTTON
    : VIDEO_CONTROLS_ARIA.PLAY_BUTTON;

  const buttonClassName = [
    PLAY_BUTTON_STYLES.HEIGHT,
    PLAY_BUTTON_STYLES.WIDTH,
    PLAY_BUTTON_STYLES.PADDING,
    PLAY_BUTTON_STYLES.BACKGROUND,
    PLAY_BUTTON_STYLES.BACKGROUND_HOVER,
    PLAY_BUTTON_STYLES.TEXT_COLOR,
    PLAY_BUTTON_STYLES.BORDER_RADIUS,
    PLAY_BUTTON_STYLES.FLEX_SHRINK,
  ].join(" ");

  return (
    <Button
      aria-label={ariaLabel}
      className={buttonClassName}
      onClick={onToggle}
      size="sm"
      type="button"
    >
      {isPlaying ? (
        <Pause aria-hidden="true" className={PLAY_BUTTON_STYLES.ICON_SIZE} />
      ) : (
        <Play
          aria-hidden="true"
          className={`${PLAY_BUTTON_STYLES.ICON_SIZE} ml-0.5`}
        />
      )}
    </Button>
  );
});
