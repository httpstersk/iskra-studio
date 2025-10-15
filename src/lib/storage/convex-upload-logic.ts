/**
 * Shared Convex upload logic for server-side use.
 *
 * This module contains the core upload logic that can be used both
 * from API routes and from server-side storage service calls.
 */

import { ConvexHttpClient } from "convex/browser";
import type { AssetUploadResult } from "@/types/asset";
import { api } from "../../../convex/_generated/api";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (Convex limit)
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

export interface UploadFileOptions {
  file: Blob;
  userId: string;
  mimeType: string;
  metadata?: {
    model?: string;
    prompt?: string;
    seed?: number;
    width?: number;
    height?: number;
    duration?: number;
  };
  authToken: string;
}

/**
 * Uploads a file to Convex storage and creates an asset record.
 *
 * @param options - Upload options including file, userId, and metadata
 * @returns Upload result with storageId, URL, and assetId
 * @throws Error if upload fails or validation fails
 */
export async function uploadFileToConvex(
  options: UploadFileOptions
): Promise<AssetUploadResult> {
  const { file, userId, mimeType, metadata = {}, authToken } = options;

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File too large. Maximum size is 25 MB.");
  }

  // Validate MIME type
  const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) =>
    mimeType.toLowerCase().startsWith(prefix)
  );

  if (!isAllowedType) {
    throw new Error(
      "Unsupported file type. Only images and videos are allowed."
    );
  }

  // Determine asset type from MIME type
  const assetType: "image" | "video" = mimeType.startsWith("image/")
    ? "image"
    : "video";

  // Get Convex deployment URL
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Convex configuration missing");
  }

  // Convert .convex.cloud to .convex.site for HTTP actions
  const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

  // Upload file to Convex storage via HTTP action
  const blob = file instanceof Blob ? await file.arrayBuffer() : file;

  const uploadResponse = await fetch(`${convexSiteUrl}/upload`, {
    body: blob,
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": mimeType,
    },
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error("Convex upload failed:", {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      errorText,
      uploadUrl: `${convexSiteUrl}/upload`,
    });
    throw new Error(
      `Convex upload failed (${uploadResponse.status}): ${errorText}`
    );
  }

  const { storageId, url } = await uploadResponse.json();

  // Create asset record in database via Convex mutation
  const convexClient = new ConvexHttpClient(convexUrl);
  convexClient.setAuth(authToken);

  // Extract dimensions and originalUrl from metadata
  const width = metadata.width;
  const height = metadata.height;
  const duration = metadata.duration;

  // Call uploadAsset mutation to create database record
  // Note: userId is derived from auth token on the backend
  const assetId = await convexClient.mutation(api.assets.uploadAsset, {
    duration: duration || undefined,
    height: height || undefined,
    mimeType,
    originalUrl: undefined,
    sizeBytes: file.size,
    storageId,
    type: assetType,
    width: width || undefined,
  });

  const result: AssetUploadResult = {
    assetId: assetId as string,
    sizeBytes: file.size,
    storageId,
    url,
  };

  return result;
}
