/**
 * Utility for uploading generated assets (images/videos) to Convex storage.
 *
 * Delegates heavy downloading to a server-side API route so the browser
 * only sends lightweight metadata while the server fetches the full asset,
 * generates thumbnails, and stores everything in Convex.
 */

interface UploadGeneratedAssetOptions {
  /**
   * Type of asset being uploaded
   */
  assetType: "image" | "video";

  /**
   * URL of the generated asset (from fal-ai or other generation service)
   */
  sourceUrl: string;

  /**
   * Optional metadata for the asset
   */
  metadata?: {
    duration?: number;
    height?: number;
    model?: string;
    prompt?: string;
    seed?: number;
    width?: number;
  };
}

interface UploadGeneratedAssetResult {
  /**
   * Asset ID in the database
   */
  assetId: string;

  /**
   * File size in bytes
   */
  sizeBytes: number;

  /**
   * Convex storage ID
   */
  storageId: string;

  /**
   * Thumbnail proxy URL (for images only)
   */

  thumbnailUrl?: string;
  /**
   * Convex storage URL for accessing the asset
   */
  url: string;
}

/**
 * Downloads a generated asset from an external URL and uploads it to Convex storage.
 *
 * @param options - Upload options
 * @returns Upload result with Convex URL and IDs
 * @throws Error if download or upload fails
 */
export async function uploadGeneratedAssetToConvex(
  options: UploadGeneratedAssetOptions
): Promise<UploadGeneratedAssetResult> {
  try {
    const response = await fetch("/api/convex/fetch-upload", {
      body: JSON.stringify(options),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${
          response.statusText || response.status || "Unknown error"
        }`
      );
    }

    const result = await response.json();

    return {
      assetId: result.assetId,
      sizeBytes: result.sizeBytes,
      storageId: result.storageId,
      thumbnailUrl: result.thumbnailProxyUrl,
      url: result.url,
    };
  } catch (error) {
    console.error("Failed to upload generated asset to Convex:", error);
    throw error;
  }
}
