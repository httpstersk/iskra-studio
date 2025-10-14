/**
 * Image model configuration and shared types.
 *
 * @remarks
 * Centralizes model endpoints to avoid hardcoding strings throughout the
 * codebase and to make future model switches trivial and safe.
 */

/**
 * Supported preset sizes for image generation.
 *
 * @remarks
 * These presets correspond to named size options offered by FAL image models.
 */
export type ImageSizePreset =
  | "landscape_16_9"
  | "landscape_4_3"
  | "portrait_16_9"
  | "portrait_4_3"
  | "square";

/**
 * Explicit size object used by endpoints that accept dimensions.
 */
export interface ImageDimensions {
  height: number;
  width: number;
}

/**
 * Canonical preset-to-dimensions mapping used across image generation calls.
 * Values target 4K-equivalent sizes.
 */
export const PRESET_DIMENSIONS: Record<ImageSizePreset, ImageDimensions> = {
  landscape_16_9: { width: 3840, height: 2160 },
  portrait_16_9: { width: 2160, height: 3840 },
  landscape_4_3: { width: 3840, height: 2880 },
  portrait_4_3: { width: 2880, height: 3840 },
  square: { width: 3840, height: 3840 },
};

/**
 * Default 4K landscape image size (3840x2160).
 */
export const DEFAULT_IMAGE_SIZE_4K_LANDSCAPE: ImageDimensions =
  PRESET_DIMENSIONS.landscape_16_9;

/**
 * Resolves an optional image size into concrete dimensions.
 *
 * @param size - Optional preset string or explicit width/height
 * @returns Concrete width/height, defaulting to 4K landscape
 */
export function resolveImageSize(
  size?: ImageSizePreset | ImageDimensions,
): ImageDimensions {
  if (!size) return DEFAULT_IMAGE_SIZE_4K_LANDSCAPE;
  if (typeof size === "string") return PRESET_DIMENSIONS[size] ?? DEFAULT_IMAGE_SIZE_4K_LANDSCAPE;
  return {
    width: size.width || DEFAULT_IMAGE_SIZE_4K_LANDSCAPE.width,
    height: size.height || DEFAULT_IMAGE_SIZE_4K_LANDSCAPE.height,
  };
}

/**
 * Seedream v4 Text-to-Image endpoint identifier.
 *
 * @remarks
 * Use this constant instead of hardcoding the endpoint string where possible.
 */
export const TEXT_TO_IMAGE_ENDPOINT =
  "fal-ai/bytedance/seedream/v4/text-to-image" as const;
