/**
 * Image compression configuration constants.
 *
 * Defines maximum dimensions and quality settings for client-side
 * image compression before uploading to Convex storage.
 */

/**
 * Maximum image width in pixels for uploads.
 * Images will be scaled down to fit within this width while maintaining aspect ratio.
 */
export const MAX_IMAGE_WIDTH = 4096;

/**
 * Maximum image height in pixels for uploads.
 * Images will be scaled down to fit within this height while maintaining aspect ratio.
 */
export const MAX_IMAGE_HEIGHT = 4096;

/**
 * JPEG compression quality (0-1).
 * 0.85 provides a good balance between file size and visual quality.
 */
export const JPEG_QUALITY = 0.85;
