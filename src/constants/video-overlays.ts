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

/**
 * Video controls styling constants
 */
export const VIDEO_CONTROLS_STYLES = {
  BACKGROUND: "bg-black/50",
  BLUR: "backdrop-blur-sm",
  BORDER_RADIUS: "rounded-lg",
  GAP: "gap-2",
  PADDING_X: "px-3",
  PADDING_Y: "py-2",
} as const;

/**
 * Play button styling constants
 */
export const PLAY_BUTTON_STYLES = {
  BACKGROUND: "bg-white/90",
  BACKGROUND_HOVER: "hover:bg-white",
  BORDER_RADIUS: "rounded-full",
  FLEX_SHRINK: "flex-shrink-0",
  HEIGHT: "h-7",
  ICON_SIZE: "h-3.5 w-3.5",
  PADDING: "p-0",
  TEXT_COLOR: "text-black",
  WIDTH: "w-7",
} as const;

/**
 * Timeline styling constants
 */
export const TIMELINE_STYLES = {
  BACKGROUND: "bg-white/30",
  BACKGROUND_PROGRESS: "bg-white",
  BORDER_RADIUS: "rounded-full",
  CURSOR: "cursor-pointer",
  FLEX: "flex-1",
  HEIGHT: "h-1",
  HEIGHT_HOVER: "hover:h-1.5",
  POSITION: "relative",
  TRANSITION: "transition-all",
} as const;

/**
 * Time display styling constants
 */
export const TIME_DISPLAY_STYLES = {
  FONT_SIZE: "text-[9px]",
  GAP: "gap-0.5",
  JUSTIFY: "justify-between",
  PADDING_X: "px-0.5",
  TEXT_COLOR: "text-white/80",
} as const;

/**
 * Video controls layout constants
 */
export const VIDEO_CONTROLS_LAYOUT = {
  BOTTOM_OFFSET: 50,
  EDGE_PADDING: "0 12px 12px 12px",
} as const;

/**
 * Time format constants
 */
export const TIME_FORMAT = {
  MIN_DIGITS: 2,
  PADDING_CHAR: "0",
  SEPARATOR: ":",
  SECONDS_PER_MINUTE: 60,
} as const;

/**
 * ARIA labels for video controls
 */
export const VIDEO_CONTROLS_ARIA = {
  CONTROLS_CONTAINER: "Video playback controls",
  PAUSE_BUTTON: "Pause video",
  PLAY_BUTTON: "Play video",
  SEEK_BAR: "Video progress",
  TIMELINE_CONTAINER: "Video timeline",
} as const;
