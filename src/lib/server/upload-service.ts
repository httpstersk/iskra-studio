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

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const UPLOAD_TIMEOUT_MS = 50000; // 50 seconds

/**
 * Metadata extracted from form data or provided by caller.
 */
export interface UploadMetadata {
  /** Duration in seconds (video only) */
  duration?: number;

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
  const mimeType = file instanceof File ? file.type : "application/octet-stream";
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Unsupported file type. Only images and videos are allowed.");
  }
}

/**
 * Uploads file to Convex HTTP endpoint.
 *
 * @param options - Upload options
 * @returns Upload response with storage IDs and URLs
 * @throws Error if upload fails or times out
 */
async function uploadToConvexEndpoint(
  options: UploadFileOptions
): Promise<ConvexUploadResponse> {
  const { file, thumbnail, authToken } = options;

  // Create multipart form data for Convex HTTP endpoint
  const formData = new FormData();
  formData.append("file", file);

  if (thumbnail) {
    formData.append("thumbnail", thumbnail);
  }

  // Setup timeout controller
  const controller = new AbortController();
  // setTimeout necessary here for network request timeout using AbortController
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const convexSiteUrl = getConvexSiteUrl();
    const response = await fetch(`${convexSiteUrl}/upload`, {
      body: formData,
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Convex upload failed (${response.status}): ${errorText}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Upload timeout: File upload took longer than ${UPLOAD_TIMEOUT_MS / 1000} seconds`
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
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
  authToken: string
): Promise<string> {
  const convexClient = createConvexClientWithToken(authToken);

  const mimeType = file instanceof File ? file.type : "application/octet-stream";
  const assetType = mimeType.startsWith("image/") ? "image" : "video";

  const assetId = await convexClient.mutation(api.assets.uploadAsset, {
    duration: metadata.duration || undefined,
    height: metadata.height || undefined,
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
 *
 * console.log(result.assetId); // "k17abc123def"
 * console.log(result.url); // "/api/storage/proxy?url=..."
 * ```
 */
export async function uploadFileToConvex(
  options: UploadFileOptions
): Promise<AssetUploadResult> {
  const { file, metadata = {}, authToken } = options;

  // Validate file
  validateFile(file);

  // Upload to Convex HTTP endpoint
  const { storageId, thumbnailStorageId, url, thumbnailUrl } =
    await uploadToConvexEndpoint(options);

  // Create asset record in database
  const assetId = await createAssetRecord(
    storageId,
    thumbnailStorageId,
    file,
    metadata,
    authToken
  );

  // Wrap URLs with CORS proxy
  const proxyUrl = wrapWithProxy(url);
  const thumbnailProxyUrl = thumbnailUrl ? wrapWithProxy(thumbnailUrl) : undefined;

  return {
    assetId,
    sizeBytes: file.size,
    storageId,
    thumbnailProxyUrl,
    thumbnailStorageId,
    url: proxyUrl,
  };
}
