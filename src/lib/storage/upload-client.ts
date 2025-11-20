/**
 * Upload client abstraction for file uploads
 */

import { httpClient } from "@/lib/api/http-client";
import type { AssetUploadResult } from "@/types/asset";

export interface UploadOptions {
  file: Blob;
  thumbnail?: Blob;
  metadata?: UploadMetadata;
  endpoint?: string;
}

export interface UploadMetadata {
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  [key: string]: unknown;
}

class UploadClient {
  private defaultEndpoint = "/api/convex/upload";

  /**
   * Upload file with optional thumbnail and metadata
   */
  async upload(options: UploadOptions): Promise<AssetUploadResult | import("@/lib/errors/safe-errors").HttpErr> {
    const { file, thumbnail, metadata, endpoint = this.defaultEndpoint } = options;

    const formData = this.buildFormData(file, thumbnail, metadata);

    return httpClient.fetchFormData<AssetUploadResult>(endpoint, formData, {
      timeout: 60000, // 60 second timeout for uploads
      retries: 3, // Retry up to 3 times
    });
  }

  /**
   * Upload from URL (fetch and upload)
   */
  async uploadFromUrl(
    url: string,
    metadata?: UploadMetadata
  ): Promise<AssetUploadResult | import("@/lib/errors/safe-errors").HttpErr> {
    return httpClient.fetchJson<AssetUploadResult>("/api/convex/fetch-upload", {
      method: "POST",
      body: { url, metadata },
      timeout: 60000,
    });
  }

  /**
   * Build FormData from upload options
   */
  private buildFormData(
    file: Blob,
    thumbnail?: Blob,
    metadata?: UploadMetadata
  ): FormData {
    const formData = new FormData();

    // Add file
    formData.append("file", file);

    // Add thumbnail if provided
    if (thumbnail) {
      formData.append("thumbnail", thumbnail);
    }

    // Add metadata
    if (metadata) {
      // Add as JSON
      formData.append("metadata", JSON.stringify(metadata));

      // Also add common fields as individual form fields for easier access
      if (metadata.width !== undefined) {
        formData.append("width", metadata.width.toString());
      }
      if (metadata.height !== undefined) {
        formData.append("height", metadata.height.toString());
      }
      if (metadata.duration !== undefined) {
        formData.append("duration", metadata.duration.toString());
      }
      if (metadata.format) {
        formData.append("format", metadata.format);
      }
    }

    return formData;
  }

  /**
   * Create a configured instance with custom defaults
   */
  withEndpoint(endpoint: string): UploadClient {
    const client = new UploadClient();
    client.defaultEndpoint = endpoint;
    return client;
  }
}

// Export singleton instance
export const uploadClient = new UploadClient();

// Export class for custom instances
export { UploadClient };
