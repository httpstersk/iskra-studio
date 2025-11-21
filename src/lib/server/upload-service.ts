/**
 * Server-side upload service for Convex storage.
 *
 * Handles file upload orchestration including:
 * - File validation
 * - Upload to Convex HTTP endpoint
 * - Asset record creation in database
 * - URL proxy wrapping for CORS support
 *
 * @remarks
 * This service separates business logic from API route handling,
 * making it testable and reusable across different server contexts.
 */

import "server-only";
import type { AssetUploadResult } from "@/types/asset";
import { api } from "../../../convex/_generated/api";
import { createConvexClientWithToken, getConvexSiteUrl } from "./convex-server";
import { httpClient } from "@/lib/api/http-client";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const UPLOAD_TIMEOUT_MS = 50000; // 50 seconds
const MAX_UPLOAD_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

/**
 * Metadata extracted from form data or provided by caller.
 */
export interface UploadMetadata {
  /** Camera angle directive for AI-generated camera angle variations */
  cameraAngle?: string;

  /** Director name for AI-generated director-style variations */
  directorName?: string;

  /** Duration in seconds (video only) */
  duration?: number;

  /** Lighting scenario for AI-generated lighting variations */
  lightingScenario?: string;

  /** Height in pixels */
  height?: number;

  /** AI model used for generation */
  model?: string;

  /** Text prompt used for generation */
  prompt?: string;

  /** Random seed used for generation */
  seed?: number;

  /** Width in pixels */
  width?: number;
}

/**
 * Options for uploading a file to Convex storage.
 */
export interface UploadFileOptions {
  /** Auth token for Convex authentication */
  authToken: string;

  /** File to upload */
  file: File | Blob;

  /** Optional metadata for the asset */
  metadata?: UploadMetadata;

  /** Optional thumbnail blob (images only) */
  thumbnail?: Blob;
}

/**
 * Result from Convex HTTP upload endpoint.
 */
interface ConvexUploadResponse {
  /** Convex storage ID for the uploaded file */
  storageId: string;

  /** Convex storage ID for thumbnail (optional) */
  thumbnailStorageId?: string;

  /** Signed URL for accessing the file */
  url: string;

  /** Signed URL for accessing the thumbnail (optional) */
  thumbnailUrl?: string;
}

/**
 * Validates file size and type.
 *
 * @param file - File to validate
 * @throws Error if validation fails
 */
function validateFile(file: File | Blob): void {
  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is 25 MB.`);
  }

  // Validate MIME type
  const mimeType = file.type || "application/octet-stream";
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error(
      "Unsupported file type. Only images and videos are allowed.",
    );
  }
}

/**
 * Checks if an error is a rate limit error.
 *
 * @param error - Error object or HttpErr
 * @returns True if the error indicates a rate limit
 */
function isRateLimitError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    // Check HttpErr payload
    if ('payload' in error) {
      const payload = (error as any).payload;
      const message = payload?.message || '';
      return message.toLowerCase().includes('rate limit');
    }

    // Check regular Error
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('rate limit');
    }
  }

  return false;
}

/**
 * Delays execution for a specified number of milliseconds.
 *
 * @param ms - Milliseconds to delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Uploads file to Convex HTTP endpoint with retry logic.
 *
 * @param options - Upload options
 * @param retryAttempt - Current retry attempt (0-indexed)
 * @returns Upload response with storage IDs and URLs, or HttpErr on failure
 * @throws Error if upload fails after all retries
 */
async function uploadToConvexEndpoint(
  options: UploadFileOptions,
  retryAttempt = 0,
): Promise<ConvexUploadResponse | import("@/lib/errors/safe-errors").HttpErr> {
  const { file, thumbnail, authToken } = options;

  // Create multipart form data for Convex HTTP endpoint
  const formData = new FormData();
  formData.append("file", file);

  if (thumbnail) {
    formData.append("thumbnail", thumbnail);
  }

  const convexSiteUrl = getConvexSiteUrl();

  try {
    const result = await httpClient.fetchFormData<ConvexUploadResponse>(
      `${convexSiteUrl}/upload`,
      formData,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        timeout: UPLOAD_TIMEOUT_MS,
      },
    );

    // If result is an error and it's a rate limit error, retry
    if ('payload' in result && isRateLimitError(result)) {
      if (retryAttempt < MAX_UPLOAD_RETRIES) {
        // Calculate exponential backoff delay: 1s, 2s, 4s
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
        console.log(`Rate limit hit, retrying in ${delayMs}ms (attempt ${retryAttempt + 1}/${MAX_UPLOAD_RETRIES + 1})`);

        await delay(delayMs);
        return uploadToConvexEndpoint(options, retryAttempt + 1);
      }
    }

    return result;
  } catch (error) {
    // Handle unexpected errors during upload
    if (isRateLimitError(error) && retryAttempt < MAX_UPLOAD_RETRIES) {
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
      console.log(`Rate limit hit (caught), retrying in ${delayMs}ms (attempt ${retryAttempt + 1}/${MAX_UPLOAD_RETRIES + 1})`);

      await delay(delayMs);
      return uploadToConvexEndpoint(options, retryAttempt + 1);
    }

    throw error;
  }
}

/**
 * Creates asset record in Convex database.
 *
 * @param storageId - Convex storage ID
 * @param thumbnailStorageId - Optional thumbnail storage ID
 * @param file - Original file
 * @param metadata - Asset metadata
 * @param authToken - Auth token
 * @returns Asset ID
 */
async function createAssetRecord(
  storageId: string,
  thumbnailStorageId: string | undefined,
  file: File | Blob,
  metadata: UploadMetadata,
  authToken: string,
): Promise<string> {
  const convexClient = createConvexClientWithToken(authToken);

  const mimeType = file.type || "application/octet-stream";
  const assetType = mimeType.startsWith("image/") ? "image" : "video";

  const assetId = await convexClient.mutation(api.assets.uploadAsset, {
    cameraAngle: metadata.cameraAngle || undefined,
    directorName: metadata.directorName || undefined,
    duration: metadata.duration || undefined,
    height: metadata.height || undefined,
    lightingScenario: metadata.lightingScenario || undefined,
    mimeType,
    originalUrl: undefined,
    sizeBytes: file.size,
    storageId,
    thumbnailStorageId: thumbnailStorageId || undefined,
    type: assetType,
    width: metadata.width || undefined,
  });

  return assetId as string;
}

/**
 * Wraps Convex signed URLs with CORS proxy.
 *
 * Convex storage URLs don't include CORS headers by default,
 * so we wrap them with our proxy endpoint.
 *
 * @param url - Convex signed URL
 * @returns Proxy URL
 */
function wrapWithProxy(url: string): string {
  return `/api/storage/proxy?url=${encodeURIComponent(url)}`;
}

/**
 * Uploads a file to Convex storage.
 *
 * Orchestrates the complete upload process:
 * 1. Validates file size and type
 * 2. Uploads file (+ optional thumbnail) to Convex HTTP endpoint
 * 3. Creates asset record in database
 * 4. Wraps URLs with CORS proxy
 *
 * @param options - Upload options
 * @returns Upload result with asset ID, storage ID, and URLs
 * @throws Error if validation or upload fails
 *
 * @example
 * ```ts
 * const result = await uploadFileToConvex({
 *   file: imageFile,
 *   authToken: token,
 *   metadata: { width: 1024, height: 768 },
 *   thumbnail: thumbnailBlob,
 * });
 * ```
 */
export async function uploadFileToConvex(
  options: UploadFileOptions,
): Promise<AssetUploadResult> {
  const { file, metadata = {}, authToken } = options;

  // Validate file
  validateFile(file);

  // Upload to Convex HTTP endpoint (with retry logic)
  const uploadResult = await uploadToConvexEndpoint(options);

  // Check if result is an error (has payload property)
  if ('payload' in uploadResult) {
    const errorMessage = uploadResult.payload.message || 'Unknown error';

    // Provide more helpful message for rate limit errors
    if (isRateLimitError(uploadResult)) {
      throw new Error(
        `Upload to Convex failed after ${MAX_UPLOAD_RETRIES + 1} attempts due to rate limiting. ` +
        `This usually happens when too many uploads are happening simultaneously. ` +
        `The system will automatically retry. Original error: ${errorMessage}`
      );
    }

    throw new Error(`Upload to Convex failed: ${errorMessage}`);
  }

  const { storageId, thumbnailStorageId, url, thumbnailUrl } = uploadResult;

  // Create asset record in database
  const assetId = await createAssetRecord(
    storageId,
    thumbnailStorageId,
    file,
    metadata,
    authToken,
  );

  // Wrap URLs with CORS proxy
  const proxyUrl = wrapWithProxy(url);
  const thumbnailProxyUrl = thumbnailUrl
    ? wrapWithProxy(thumbnailUrl)
    : undefined;

  return {
    assetId,
    sizeBytes: file.size,
    storageId,
    thumbnailProxyUrl,
    thumbnailStorageId,
    url: proxyUrl,
  };
}
