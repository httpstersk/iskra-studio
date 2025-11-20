/**
 * Asset download and re-upload handler.
 *
 * Handles downloading assets from FAL (or other sources) and
 * re-uploading them to Convex storage for long-term persistence.
 * Uses errors-as-values pattern with @safe-std/error
 */

import type { AssetMetadata, AssetUploadResult } from "@/types/asset";
import { createStorageService } from "@/lib/storage";
import { StorageErr, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Options for downloading and re-uploading an asset.
 */
export interface DownloadAndReuploadOptions {
  /** Additional metadata to store with the asset */
  metadata?: AssetMetadata;

  /** MIME type of the asset */
  mimeType: string;

  /** Type of asset */
  type: "image" | "video";

  /** User ID of the asset owner */
  userId: string;
}

/**
 * Downloads an asset from a URL and re-uploads it to Convex storage.
 *
 * Used after AI generation completes to move assets from FAL's temporary
 * storage to Convex's persistent storage. Includes retry logic and timeout
 * handling for reliable asset migration.
 * Returns errors as values instead of throwing.
 *
 * @param url - URL of the asset to download (typically a FAL URL)
 * @param options - Upload options including userId, type, and metadata
 * @returns Upload result with Convex storage URL and asset ID or error
 *
 * @example
 * ```ts
 * // After image generation completes
 * const result = await downloadAndReupload(falImageUrl, {
 *   userId: "user_123",
 *   type: "image",
 *   mimeType: "image/png",
 *   metadata: {
 *     prompt: "A beautiful sunset",
 *     model: "flux-pro/v1.1",
 *     seed: 12345,
 *     width: 1024,
 *     height: 1024,
 *     originalFalUrl: falImageUrl,
 *   },
 * });
 *
 * if (isErr(result)) {
 *   console.error('Migration failed:', getErrorMessage(result));
 *   return;
 * }
 *
 * // Replace FAL URL with Convex URL in canvas state
 * updateCanvasImage(result.url);
 * ```
 */
export async function downloadAndReupload(
  url: string,
  options: DownloadAndReuploadOptions,
): Promise<AssetUploadResult | StorageErr> {
  const storage = createStorageService();

  // Download the asset from the source URL
  const blob = await storage.download(url, {
    timeout: 30000, // 30 second timeout
    maxRetries: 3,
  });

  if (isErr(blob)) {
    return new StorageErr({
      message: `Asset download failed: ${getErrorMessage(blob)}`,
      operation: "download",
      cause: blob,
    });
  }

  // Upload to Convex storage
  const result = await storage.upload(blob, {
    userId: options.userId,
    type: options.type,
    mimeType: options.mimeType,
    metadata: {
      ...options.metadata,
      originalFalUrl: url, // Store original FAL URL for reference
    },
  });

  if (isErr(result)) {
    return new StorageErr({
      message: `Asset upload failed: ${getErrorMessage(result)}`,
      operation: "upload",
      cause: result,
    });
  }

  return result;
}

/**
 * Downloads multiple assets in parallel and re-uploads them to Convex.
 *
 * Useful for batch operations when multiple assets need to be migrated
 * at once. Failed downloads will not stop the entire batch.
 * Returns errors as values instead of throwing.
 *
 * @param assets - Array of asset URLs and their options
 * @returns Array of upload results (StorageErr for failed uploads)
 *
 */
export async function downloadAndReuploadBatch(
  assets: Array<{ url: string; options: DownloadAndReuploadOptions }>,
): Promise<Array<AssetUploadResult | StorageErr>> {
  const promises = assets.map(async ({ url, options }) => {
    const result = await downloadAndReupload(url, options);

    if (isErr(result)) {
      // Return error wrapped in StorageErr with batch context
      return new StorageErr({
        message: `Batch upload failed for ${url}: ${getErrorMessage(result)}`,
        operation: "upload",
        cause: result,
      });
    }

    return result;
  });

  return Promise.all(promises);
}
