/**
 * Storage service barrel export.
 * 
 * Exports storage service interface, implementation, and factory function
 * for creating storage service instances.
 */

import { ConvexStorageService } from "./convex-storage-service";

export { ConvexStorageService };
export type {
  DownloadOptions,
  StorageService,
  UploadOptions,
} from "./storage-service";

/**
 * Creates a storage service instance.
 * 
 * Factory function for creating storage service implementations.
 * Currently returns ConvexStorageService, but can be extended to
 * support other backends (FAL, S3, etc.) in the future.
 * 
 * @param type - Type of storage service to create (default: "convex")
 * @returns Storage service instance
 * 
 * @example
 * ```ts
 * const storage = createStorageService();
 * 
 * const result = await storage.upload(file, {
 *   userId: "user_123",
 *   type: "image",
 *   mimeType: "image/png",
 * });
 * ```
 */
export function createStorageService(
  type: "convex" = "convex"
): import("./storage-service").StorageService {
  switch (type) {
    case "convex":
      return new ConvexStorageService();
    default:
      throw new Error(`Unsupported storage service type: ${type}`);
  }
}
