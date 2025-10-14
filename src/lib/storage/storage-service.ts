/**
 * Abstract storage service interface for file operations.
 * 
 * Defines a common interface for storage implementations (Convex, FAL, etc.)
 * allowing the application to swap storage backends without changing business logic.
 */

import type { AssetMetadata, AssetUploadResult } from "@/types/asset";

/**
 * Options for uploading a file to storage.
 */
export interface UploadOptions {
  /** Additional metadata to store with the asset */
  metadata?: AssetMetadata;
  
  /** MIME type of the file */
  mimeType: string;
  
  /** Type of asset being uploaded */
  type: "image" | "video";
  
  /** User ID of the asset owner */
  userId: string;
}

/**
 * Options for downloading a file from a URL.
 */
export interface DownloadOptions {
  /** Maximum number of retry attempts on failure */
  maxRetries?: number;
  
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Abstract storage service interface.
 * 
 * Defines methods for uploading, deleting, and retrieving files from storage.
 * Implementations must handle authentication, quota checks, and error handling.
 * 
 * @remarks
 * This abstraction allows swapping between different storage backends
 * (e.g., Convex, FAL, S3) without changing application code.
 * 
 * @example
 * ```ts
 * const storage: StorageService = new ConvexStorageService();
 * 
 * // Upload a file
 * const result = await storage.upload(file, {
 *   userId: "user_123",
 *   type: "image",
 *   mimeType: "image/png",
 *   metadata: { prompt: "A sunset over mountains" },
 * });
 * 
 * // Get the URL
 * const url = await storage.getUrl(result.storageId);
 * 
 * // Delete the file
 * await storage.delete(result.storageId, "user_123");
 * ```
 */
export interface StorageService {
  /**
   * Deletes a file from storage.
   * 
   * @param storageId - Unique identifier for the file in storage
   * @param userId - User ID of the file owner (for authorization)
   * @returns Promise that resolves when deletion is complete
   * @throws Error if deletion fails or user is not authorized
   */
  delete(storageId: string, userId: string): Promise<void>;

  /**
   * Downloads a file from a URL and returns it as a Blob.
   * 
   * @param url - URL of the file to download
   * @param options - Download options (retries, timeout)
   * @returns Promise resolving to the downloaded file as a Blob
   * @throws Error if download fails after all retries
   */
  download(url: string, options?: DownloadOptions): Promise<Blob>;

  /**
   * Gets the public URL for accessing a stored file.
   * 
   * @param storageId - Unique identifier for the file in storage
   * @returns Promise resolving to the public URL
   * @throws Error if file does not exist
   */
  getUrl(storageId: string): Promise<string>;

  /**
   * Uploads a file to storage.
   * 
   * @param file - File blob to upload
   * @param options - Upload options (userId, type, metadata)
   * @returns Promise resolving to upload result with storageId and URL
   * @throws Error if upload fails or quota is exceeded
   */
  upload(file: Blob, options: UploadOptions): Promise<AssetUploadResult>;
}
