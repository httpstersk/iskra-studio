/**
 * Video performance constants
 *
 * Configuration for video rendering performance optimization.
 * Based on research from: https://lavrton.com/case-study-video-editor-for-stream/
 *
 * @module constants/video-performance
 */

/**
 * FPS quality presets for video canvas rendering.
 * Lower FPS = better battery life and lower CPU usage.
 * Higher FPS = smoother playback for high-motion content.
 */
export const FPS_PRESETS = {
  /** High quality - 50 FPS for smooth high-motion video */
  high: 1000 / 50,
  /** Medium quality - 30 FPS (recommended default, matches most video sources) */
  medium: 1000 / 30,
  /** Low quality - 15 FPS for battery saving mode */
  low: 1000 / 15,
} as const;

/**
 * Default FPS quality setting.
 * 30 FPS provides optimal balance between smoothness and performance.
 * Most video sources are 24-30 FPS, so 30 FPS canvas refresh is ideal.
 */
export const DEFAULT_VIDEO_FPS_QUALITY = "medium" as const;

/**
 * Interval in milliseconds for default quality video rendering.
 */
export const DEFAULT_VIDEO_FPS_INTERVAL = FPS_PRESETS[DEFAULT_VIDEO_FPS_QUALITY];

/**
 * Type for FPS quality levels
 */
export type VideoFPSQuality = keyof typeof FPS_PRESETS;
