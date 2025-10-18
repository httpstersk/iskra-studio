/**
 * Constants for video overlay components
 *
 * @module constants/video-overlays
 */

/**
 * Z-index for video overlays and controls
 */
export const VIDEO_OVERLAY_Z_INDEX = 10;

/**
 * Minimum width for video controls in pixels
 */
export const VIDEO_CONTROLS_MIN_WIDTH = 180;

/**
 * Border color for selected videos (subtle blue glow)
 */
export const VIDEO_SELECTED_BORDER_COLOR = "#0ea5e9";

/**
 * Border width for selected videos (minimal, hair-thin)
 */
export const VIDEO_SELECTED_BORDER_WIDTH = "0.5px";

/**
 * Shadow for selected videos (minimalist glow effect)
 */
export const VIDEO_SELECTED_SHADOW = "0 0 12px 0 rgba(14, 165, 233, 0.4)";

/**
 * Opacity transition duration for video controls
 */
export const VIDEO_CONTROLS_TRANSITION = "opacity 0.05s ease-in-out";

/**
 * Offset for video controls below the video element
 */
export const VIDEO_CONTROLS_OFFSET = 10;

/**
 * Offset for play indicator from video top-left corner
 */
export const PLAY_INDICATOR_OFFSET = 5;

/**
 * Font size range for play indicator based on scale
 */
export const PLAY_INDICATOR_FONT_SIZE = {
  MAX: 20,
  MIN: 10,
  SCALE_FACTOR: 20,
} as const;
