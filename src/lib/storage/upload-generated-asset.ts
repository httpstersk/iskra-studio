import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Utility for uploading generated assets (images/videos) to Convex storage.
 *
 * Delegates heavy downloading to a server-side API route so the browser
 * only sends lightweight metadata while the server fetches the full asset,
 * generates thumbnails, and stores everything in Convex.
 */

type UploadGeneratedAssetOptions = GeneratedAssetUploadPayload;

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
  options: UploadGeneratedAssetOptions,
): Promise<UploadGeneratedAssetResult> {
  try {
    const fetchResult = await tryPromise(
      fetch("/api/convex/fetch-upload", {
        body: JSON.stringify(options),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    );

    if (isErr(fetchResult)) {
      throw new Error(`Failed to fetch upload endpoint: ${getErrorMessage(fetchResult)}`);
    }

    const response = fetchResult;

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${
          response.statusText || response.status || "Unknown error"
        }`,
      );
    }

    const jsonResult = await tryPromise(response.json());
    if (isErr(jsonResult)) {
      throw new Error(`Failed to parse upload response: ${getErrorMessage(jsonResult)}`);
    }

    const result = jsonResult;

    return {
      assetId: result.assetId,
      sizeBytes: result.sizeBytes,
      storageId: result.storageId,
      thumbnailUrl: result.thumbnailProxyUrl,
      url: result.url,
    };
  } catch (error) {
    throw error;
  }
}
