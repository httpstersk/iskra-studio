/**
 * Asset type definitions for file storage in Convex.
 *
 * Defines types for managing images and videos stored in Convex,
 * including metadata for AI generation parameters and upload results.
 */

/**
 * Type of asset stored in Convex.
 */
export type AssetType = "image" | "video";

/**
 * Metadata for AI-generated assets.
 *
 * Stores generation parameters to enable reproducibility and
 * provide context for generated content.
 *
 * @remarks
 * All fields are optional as not all assets are AI-generated.
 */
export interface AssetMetadata {
  /** Duration of video in seconds (video only) */
  duration?: number;

  /** Height of image/video in pixels */
  height?: number;

  /** AI model used for generation */
  model?: string;

  /** Original FAL URL before uploading to Convex */
  originalFalUrl?: string;

  /** Text prompt used for generation */
  prompt?: string;

  /** Random seed used for generation */
  seed?: number;

  /** Width of image/video in pixels */
  width?: number;

  /** Allow additional metadata properties */
  [key: string]: unknown;
}

/**
 * Asset record from Convex database.
 *
 * Represents a file (image or video) stored in Convex storage
 * with associated metadata and ownership information.
 *
 * @remarks
 * - storageId references the file in Convex storage
 * - userId links asset to the owner for quota tracking
 * - sizeBytes is used for storage quota calculations
 */
export interface Asset {
  /** Camera angle directive for AI-generated camera angle variations */
  cameraAngle?: string;

  /** Timestamp when the asset was created (ms since epoch) */
  createdAt: number;

  /** Lighting scenario for AI-generated lighting variations */
  lightingScenario?: string;

  /** Director name for AI-generated director-style variations */
  directorName?: string;

  /** Duration in seconds (video only) */
  duration?: number;

  /** Height in pixels */
  height?: number;

  /** Unique identifier for the asset record */
  id: string;

  /** MIME type of the file (e.g., "image/png", "video/mp4") */
  mimeType: string;

  /** Original URL before uploading to Convex (if applicable) */
  originalUrl?: string;

  /** Size of the file in bytes */
  sizeBytes: number;

  /** Convex storage ID for retrieving the file */
  storageId: string;

  /** Type of asset */
  type: AssetType;

  /** User ID of the asset owner */
  userId: string;

  /** Width in pixels */
  width?: number;
}

/**
 * Result returned from asset upload operations.
 *
 * Provides essential information needed to reference and display
 * the uploaded asset in the application. Includes thumbnail data for images
 * to optimize bandwidth usage.
 *
 * @example
 * ```ts
 * const result: AssetUploadResult = {
 *   assetId: "k17abc123def",
 *   sizeBytes: 2048576,
 *   storageId: "kg2xyz789abc",
 *   thumbnailStorageId: "kg2xyz789def",
 *   url: "https://example.convex.cloud/api/storage/kg2xyz789abc",
 * };
 * ```
 */
export interface AssetUploadResult {
  /** Unique identifier for the asset record in database */
  assetId: string;

  /** Size of the uploaded file in bytes */
  sizeBytes: number;

  /** Convex storage ID for the uploaded file (full-size, for FAL API) */
  storageId: string;

  /** Convex storage ID for thumbnail (optional, images only) */
  thumbnailStorageId?: string;

  /** Public URL to access the uploaded file with CORS support */
  url: string;

  /** Public proxy URL to access the thumbnail with CORS support (optional, images only) */
  thumbnailProxyUrl?: string;
}
