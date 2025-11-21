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
 * Values target 2K-equivalent sizes.
 */
export const PRESET_DIMENSIONS: Record<ImageSizePreset, ImageDimensions> = {
  landscape_16_9: { width: 2560, height: 1440 },
  portrait_16_9: { width: 1440, height: 2560 },
  landscape_4_3: { width: 2560, height: 1920 },
  portrait_4_3: { width: 1920, height: 2560 },
  square: { width: 2560, height: 2560 },
};

/**
 * Default 2K landscape image size (2560x1440).
 */
export const DEFAULT_IMAGE_SIZE_2K_LANDSCAPE: ImageDimensions =
  PRESET_DIMENSIONS.landscape_16_9;

/**
 * Resolves an optional image size into concrete dimensions.
 *
 * @param size - Optional preset string or explicit width/height
 * @returns Concrete width/height, defaulting to 2K landscape
 */
export function resolveImageSize(
  size?: ImageSizePreset | ImageDimensions,
): ImageDimensions {
  if (!size) return DEFAULT_IMAGE_SIZE_2K_LANDSCAPE;
  if (typeof size === "string")
    return PRESET_DIMENSIONS[size] ?? DEFAULT_IMAGE_SIZE_2K_LANDSCAPE;
  return {
    width: size.width || DEFAULT_IMAGE_SIZE_2K_LANDSCAPE.width,
    height: size.height || DEFAULT_IMAGE_SIZE_2K_LANDSCAPE.height,
  };
}

/**
 * Image model identifiers for variation generation.
 */
export const IMAGE_MODELS = {
  SEEDREAM: "seedream",
  NANO_BANANA: "nano-banana",
} as const;

export type ImageModelId = (typeof IMAGE_MODELS)[keyof typeof IMAGE_MODELS];

/**
 * Seedream v4 Text-to-Image endpoint identifier.
 *
 * @remarks
 * Use this constant instead of hardcoding the endpoint string where possible.
 */
export const TEXT_TO_IMAGE_ENDPOINT =
  "fal-ai/bytedance/seedream/v4/text-to-image" as const;

/**
 * Seedream v4 Edit endpoint for image variations.
 */
export const SEEDREAM_EDIT_ENDPOINT =
  "fal-ai/bytedance/seedream/v4/edit" as const;

/**
 * Nano Banana Edit endpoint for image variations.
 */
export const NANO_BANANA_EDIT_ENDPOINT = "fal-ai/nano-banana-pro/edit" as const;

/**
 * Maps model IDs to their corresponding endpoint strings.
 */
export const IMAGE_MODEL_ENDPOINTS: Record<ImageModelId, string> = {
  [IMAGE_MODELS.SEEDREAM]: SEEDREAM_EDIT_ENDPOINT,
  [IMAGE_MODELS.NANO_BANANA]: NANO_BANANA_EDIT_ENDPOINT,
};

/**
 * Gets the endpoint for a given image model ID.
 */
export function getImageModelEndpoint(modelId: ImageModelId): string {
  return IMAGE_MODEL_ENDPOINTS[modelId];
}
