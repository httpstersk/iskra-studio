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
export const VIDEO_CONTROLS_OFFSET = 0;

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
  BACKGROUND: "bg-card/95",
  BORDER: "border border-border/50",
  BORDER_RADIUS: "rounded-lg",
  GAP: "gap-3",
  PADDING_X: "px-2",
  PADDING_Y: "py-2",
  SHADOW: "shadow-lg",
} as const;

/**
 * Play button styling constants
 */
export const PLAY_BUTTON_STYLES = {
  BACKGROUND: "bg-secondary",
  BACKGROUND_HOVER: "hover:bg-accent",
  BORDER: "border border-border",
  BORDER_RADIUS: "rounded-md",
  FLEX_SHRINK: "flex-shrink-0",
  HEIGHT: "h-6",
  ICON_SIZE: "size-4",
  PADDING: "p-0",
  TEXT_COLOR: "text-foreground",
  WIDTH: "w-6",
} as const;

/**
 * Timeline styling constants
 */
export const TIMELINE_STYLES = {
  BACKGROUND: "bg-muted",
  BACKGROUND_PROGRESS: "bg-foreground",
  BORDER_RADIUS: "rounded-full",
  CURSOR: "cursor-pointer",
  FLEX: "flex-1",
  HEIGHT: "h-1.5",
  HEIGHT_HOVER: "hover:h-2",
  POSITION: "relative",
  TRANSITION: "transition-all",
} as const;

/**
 * Time display styling constants
 */
export const TIME_DISPLAY_STYLES = {
  FONT_SIZE: "text-xs",
  GAP: "gap-0.5",
  JUSTIFY: "justify-between",
  PADDING_X: "px-0.5",
  TEXT_COLOR: "text-muted-foreground",
} as const;

/**
 * Video controls layout constants
 */
export const VIDEO_CONTROLS_LAYOUT = {
  BOTTOM_PADDING: "12px",
  SIDE_PADDING: "12px",
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

/**
 * Video element configuration constants
 */
export const VIDEO_ELEMENT_CONFIG = {
  CORS_ORIGIN: "anonymous",
  OBJECT_FIT: "fill",
  POINTER_EVENTS: "none",
  POSITION: "absolute",
  PRELOAD: "auto",
  TRANSFORM_ORIGIN: "center",
  VISIBILITY: "hidden",
} as const;
