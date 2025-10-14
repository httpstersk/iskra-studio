/**
 * Utility for uploading generated assets (images/videos) to Convex storage.
 * 
 * Handles downloading generated content from external URLs (e.g., fal-ai)
 * and uploading to Convex for permanent storage.
 */

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
    // Download the asset from the source URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Determine MIME type
    const mimeType = blob.type || (assetType === "image" ? "image/png" : "video/mp4");

    // Create form data for upload
    const formData = new FormData();
    formData.append("file", blob, assetType === "image" ? "generated.png" : "generated.mp4");

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
    };
  } catch (error) {
    console.error("Failed to upload generated asset to Convex:", error);
    throw error;
  }
}
