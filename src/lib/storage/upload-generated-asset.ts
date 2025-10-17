/**
 * Utility for uploading generated assets (images/videos) to Convex storage.
 * 
 * Handles downloading generated content from external URLs (e.g., fal-ai)
 * and uploading to Convex for permanent storage.
 */

import { generateThumbnail } from "@/lib/utils/generate-thumbnail";

interface UploadGeneratedAssetOptions {
  /**
   * URL of the generated asset (from fal-ai or other generation service)
   */
  sourceUrl: string;
  
  /**
   * Type of asset being uploaded
   */
  assetType: "image" | "video";
  
  /**
   * Optional metadata for the asset
   */
  metadata?: {
    model?: string;
    prompt?: string;
    seed?: number;
    width?: number;
    height?: number;
    duration?: number;
  };
}

interface UploadGeneratedAssetResult {
  /**
   * Convex storage URL for accessing the asset
   */
  url: string;
  
  /**
   * Convex storage ID
   */
  storageId: string;
  
  /**
   * Asset ID in the database
   */
  assetId: string;
  
  /**
   * File size in bytes
   */
  sizeBytes: number;
  
  /**
   * Thumbnail proxy URL (for images only)
   */
  thumbnailUrl?: string;
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
  const { sourceUrl, assetType, metadata = {} } = options;

  try {
    // Handle proxy URLs - extract the actual signed URL if it's a proxy URL
    let downloadUrl = sourceUrl;
    
    if (sourceUrl.includes("/api/storage/proxy")) {
      // Extract the signed URL from the proxy URL's query parameter
      try {
        const url = new URL(sourceUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        const signedUrl = url.searchParams.get("url");
        if (signedUrl) {
          downloadUrl = signedUrl;
        }
      } catch {
        // If URL parsing fails, fall back to the original URL
        downloadUrl = sourceUrl;
      }
    } else if (sourceUrl.startsWith("/")) {
      // Handle other relative URLs by making them absolute
      downloadUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}${sourceUrl}`;
    }

    // Download the asset from the source URL
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Determine MIME type
    const mimeType = blob.type || (assetType === "image" ? "image/png" : "video/mp4");

    // Create form data for upload
    const formData = new FormData();
    formData.append("file", blob, assetType === "image" ? "generated.png" : "generated.mp4");

    // Generate thumbnail for images (bandwidth optimization)
    if (assetType === "image") {
      console.log("[Upload] Generating thumbnail for image, blob size:", blob.size);
      const thumbnailBlob = await generateThumbnail(blob);
      if (thumbnailBlob) {
        console.log("[Upload] Thumbnail generated successfully, size:", thumbnailBlob.size);
        formData.append("thumbnail", thumbnailBlob);
      } else {
        console.warn("[Upload] Thumbnail generation returned undefined");
      }
    }

    // Add metadata if provided
    if (metadata.width) {
      formData.append("width", metadata.width.toString());
    }
    if (metadata.height) {
      formData.append("height", metadata.height.toString());
    }
    if (metadata.duration) {
      formData.append("duration", metadata.duration.toString());
    }

    // Add generation metadata (model, prompt, seed)
    const generationMetadata: Record<string, string | number> = {};
    if (metadata.model) generationMetadata.model = metadata.model;
    if (metadata.prompt) generationMetadata.prompt = metadata.prompt;
    if (metadata.seed !== undefined) generationMetadata.seed = metadata.seed;

    if (Object.keys(generationMetadata).length > 0) {
      formData.append("metadata", JSON.stringify(generationMetadata));
    }

    // Upload to Convex
    const uploadResponse = await fetch("/api/convex/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => null);
      throw new Error(
        errorData?.message || `Upload failed: ${uploadResponse.statusText}`
      );
    }

    const result = await uploadResponse.json();

    return {
      url: result.url,
      storageId: result.storageId,
      assetId: result.assetId,
      sizeBytes: result.sizeBytes,
      thumbnailUrl: result.thumbnailProxyUrl,
    };
  } catch (error) {
    console.error("Failed to upload generated asset to Convex:", error);
    throw error;
  }
}
