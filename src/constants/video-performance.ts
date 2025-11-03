/**
 * Video performance constants
 *
 * Configuration for video rendering performance optimization.
 * Based on research from: https://lavrton.com/case-study-video-editor-for-stream/
 *
 * Advanced optimizations include:
 * - FPS control with quality presets
 * - Shared animation coordinator (batched layer redraws)
 * - Page Visibility API integration
 * - Adaptive performance based on device capabilities
 * - ImageBitmap support for faster rendering
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
export const DEFAULT_VIDEO_FPS_INTERVAL =
  FPS_PRESETS[DEFAULT_VIDEO_FPS_QUALITY];

/**
 * Type for FPS quality levels
 */
export type VideoFPSQuality = keyof typeof FPS_PRESETS;

/**
 * Memory optimization settings for video elements
 */
export const VIDEO_MEMORY_LIMITS = {
  /** Maximum number of video elements to keep in memory */
  MAX_CONCURRENT_VIDEOS: 10,
  /** Distance from viewport (in pixels) before unloading video data */
  UNLOAD_DISTANCE: 5000,
  /** Buffer time (ms) before unloading off-screen video */
  UNLOAD_DELAY: 3000,
} as const;

/**
 * Performance monitoring settings
 */
export const PERFORMANCE_MONITORING = {
  /** Enable adaptive FPS based on device performance */
  ADAPTIVE_FPS_ENABLED: true,
  /** Enable battery-aware performance mode */
  BATTERY_AWARE_ENABLED: true,
  /** Enable ImageBitmap optimization (if browser supports) */
  USE_IMAGE_BITMAP: true,
} as const;
