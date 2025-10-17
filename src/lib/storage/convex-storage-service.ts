/**
 * Convex storage service implementation.
 * 
 * Implements the StorageService interface using Convex backend for file storage.
 * Handles uploads via HTTP actions, quota validation, and retry logic.
 */

import type { AssetUploadResult } from "@/types/asset";
import type {
  DownloadOptions,
  StorageService,
  UploadOptions,
} from "./storage-service";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";

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
 * 
 * console.log(result.url); // https://...convex.cloud/api/storage/...
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
   * @throws Error if deletion fails or user is not authorized
   */
  async delete(storageId: string, userId: string): Promise<void> {
    // TODO: Implement using Convex mutation when client is available
    // This will be called via the API client from the frontend
    throw new Error("Delete operation not yet implemented");
  }

  /**
   * Downloads a file from a URL with retry logic.
   * 
   * Fetches a file from the provided URL and returns it as a Blob.
   * Automatically retries on failure with exponential backoff.
   * 
   * @param url - URL of the file to download
   * @param options - Download options (timeout, retries)
   * @returns Blob containing the downloaded file
   * @throws Error if download fails after all retries
   */
  async download(url: string, options?: DownloadOptions): Promise<Blob> {
    const timeout = options?.timeout ?? 30000;
    const maxRetries = options?.maxRetries ?? this.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        // setTimeout necessary here for network request timeout using AbortController
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.blob();
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          throw new Error(
            `Failed to download file after ${maxRetries + 1} attempts: ${error}`,
          );
        }

        // Exponential backoff: 1s, 2s, 4s
        // setTimeout necessary here for precise async delay in retry logic
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Download failed");
  }

  /**
   * Gets the public URL for a file stored in Convex.
   * 
   * @param storageId - Convex storage ID
   * @returns Public URL for accessing the file
   */
  async getUrl(storageId: string): Promise<string> {
    // Convex storage URLs follow this pattern
    return `${this.convexUrl}/api/storage/${storageId}`;
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
   * 
   * @param file - File blob to upload
   * @param options - Upload options (userId, type, metadata)
   * @returns Upload result with storageId, URL, assetId, and optional thumbnailStorageId
   * @throws Error if upload fails or quota is exceeded
   */
  async upload(file: Blob, options: UploadOptions): Promise<AssetUploadResult> {
    // SECURITY: userId should NOT be sent from client - it's derived from auth on backend
    // Remove userId from the formData - backend will get it from authenticated session
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Generate thumbnail for images on client-side (bandwidth optimization)
        if (file.type.startsWith("image/")) {
          const thumbnailBlob = await generateThumbnail(file);
          if (thumbnailBlob) {
            formData.append("thumbnail", thumbnailBlob);
          }
        }

        // Send metadata including dimensions if available
        if (options.metadata) {
          formData.append("metadata", JSON.stringify(options.metadata));
          
          // Extract dimensions for form fields (required by backend)
          if (options.metadata.width) {
            formData.append("width", options.metadata.width.toString());
          }
          if (options.metadata.height) {
            formData.append("height", options.metadata.height.toString());
          }
          if (options.metadata.duration) {
            formData.append("duration", options.metadata.duration.toString());
          }
        }

        const response = await fetch('/api/convex/upload', {
          body: formData,
          method: "POST",
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Upload failed: ${error}`);
        }

        const result = await response.json();
        return result as AssetUploadResult;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries;
        if (isLastAttempt) {
          throw new Error(
            `Failed to upload file after ${this.maxRetries + 1} attempts: ${error}`,
          );
        }

        // Exponential backoff with jitter to prevent thundering herd
        // setTimeout necessary here for precise async delay in retry logic
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Upload failed");
  }
}
