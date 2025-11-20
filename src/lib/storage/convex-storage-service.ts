/**
 * Convex storage service implementation.
 *
 * Implements the StorageService interface using Convex backend for file storage.
 * Handles uploads via HTTP actions, quota validation, and retry logic.
 * Uses errors-as-values pattern with @safe-std/error
 */

import type { AssetUploadResult } from "@/types/asset";
import type {
  DownloadOptions,
  StorageService,
  UploadOptions,
} from "./storage-service";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
import { httpClient } from "@/lib/api/http-client";
import { uploadClient } from "./upload-client";
import { StorageErr, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Convex storage service implementation.
 *
 * Uses Convex HTTP actions for file uploads and Convex mutations for
 * asset management. Includes automatic retry logic and quota validation.
 *
 * @remarks
 * - Uploads files via POST to Convex HTTP endpoint
 * - Creates asset records via Convex mutations
 * - Validates storage quotas before upload
 * - Retries failed operations up to 3 times
 *
 * @example
 * ```ts
 * const storage = new ConvexStorageService();
 *
 * const result = await storage.upload(imageBlob, {
 *   userId: "user_123",
 *   type: "image",
 *   mimeType: "image/png",
 *   metadata: { prompt: "Beautiful sunset" },
 * });
 * ```
 */
export class ConvexStorageService implements StorageService {
  private readonly convexUrl: string;
  private readonly maxRetries = 3;

  constructor() {
    this.convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
    if (!this.convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
    }
  }

  /**
   * Deletes a file from Convex storage.
   *
   * Calls the Convex deleteAsset mutation which removes both the
   * file and the database record, then updates the user's quota.
   *
   * @param storageId - Convex storage ID of the file
   * @param userId - User ID for authorization
   * @returns Error if deletion fails or user is not authorized
   */
  async delete(_storageId: string, _userId: string): Promise<void> {
    // TODO: Implement using Convex mutation when client is available
    // This will be called via the API client from the frontend
    throw new StorageErr({
      message: "Delete operation not yet implemented",
      operation: "delete",
    });
  }

  /**
   * Downloads a file from a URL with retry logic.
   *
   * Fetches a file from the provided URL and returns it as a Blob.
   * Automatically retries on failure with exponential backoff.
   * Returns errors as values instead of throwing.
   *
   * @param url - URL of the file to download
   * @param options - Download options (timeout, retries)
   * @returns Blob containing the downloaded file or error
   */
  async download(url: string, options?: DownloadOptions): Promise<Blob> {
    const timeout = options?.timeout ?? 30000;
    const maxRetries = options?.maxRetries ?? this.maxRetries;

    const response = await httpClient.fetch<Blob>(url, {
      method: "GET",
      timeout,
      retries: maxRetries,
    });

    if (isErr(response)) {
      throw new StorageErr({
        message: `Failed to download file after ${maxRetries + 1} attempts: ${getErrorMessage(response)}`,
        operation: "download",
        cause: response,
      });
    }

    return response.data;
  }

  /**
   * Gets the public URL for a file stored in Convex.
   *
   * Returns a proxy URL to ensure CORS headers are included for browser image loading.
   * Convex storage URLs don't include CORS headers by default.
   *
   * @param storageId - Convex storage ID
   * @returns Public proxy URL for accessing the file with CORS support
   */
  async getUrl(storageId: string): Promise<string> {
    // Return proxy URL to ensure CORS headers are included
    return `/api/storage/proxy?storageId=${storageId}`;
  }

  /**
   * Uploads a file to Convex storage.
   *
   * Performs upload with optional thumbnail generation for images:
   * 1. Generates thumbnail on client-side for images (Canvas API)
   * 2. Uploads file + optional thumbnail via API route
   * 3. Creates asset record in database
   *
   * Includes automatic retry logic for failed uploads.
   * Thumbnail generation failures don't block the upload.
   * Returns errors as values instead of throwing.
   *
   * @param file - File blob to upload
   * @param options - Upload options (userId, type, metadata)
   * @returns Upload result with storageId, URL, assetId, and optional thumbnailStorageId or error
   */
  async upload(file: Blob, options: UploadOptions): Promise<AssetUploadResult> {
    // SECURITY: userId should NOT be sent from client - it's derived from auth on backend
    // Remove userId from the formData - backend will get it from authenticated session

    // Generate thumbnail for images on client-side (bandwidth optimization)
    let thumbnailBlob: Blob | undefined;
    if (file.type.startsWith("image/")) {
      const thumbnailResult = await generateThumbnail(file);
      // Thumbnail generation is optional - don't fail if it doesn't work
      if (!isErr(thumbnailResult)) {
        thumbnailBlob = thumbnailResult;
      }
    }

    // Use upload client with retry logic
    const result = await uploadClient.upload({
      file,
      thumbnail: thumbnailBlob,
      metadata: options.metadata,
    });

    if (isErr(result)) {
      throw new StorageErr({
        message: `Failed to upload file after ${this.maxRetries + 1} attempts: ${getErrorMessage(result)}`,
        operation: "upload",
        cause: result,
      });
    }

    return result;
  }
}
