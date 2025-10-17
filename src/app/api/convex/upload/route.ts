/**
 * Convex file upload API route.
 *
 * Handles file uploads to Convex storage with authentication,
 * quota validation, and asset record creation.
 * Accepts optional thumbnail blob for bandwidth optimization.
 */

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

export const maxDuration = 60;

// Allow up to 50MB request bodies for file uploads
export const config = {
  maxBodySize: "50mb",
};

/**
 * POST handler for uploading files to Convex storage.
 *
 * Validates authentication, checks storage quota, uploads file
 * to Convex, and creates an asset record in the database.
 *
 * @remarks
 * - Requires Clerk authentication
 * - Enforces storage quota limits per user tier
 * - Supports image/* and video/* MIME types
 * - Maximum file size: 25 MB
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append("file", imageBlob);
 *
 * const response = await fetch("/api/convex/upload", {
 *   method: "POST",
 *   body: formData,
 * });
 *
 * const result = await response.json();
 * console.log(result.url); // Convex storage URL
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const authData = await auth();
    const { userId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get auth token
    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    // Parse form data (file + optional thumbnail)
    const formData = await req.formData();
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract metadata from form data if provided
    const metadataStr = formData.get("metadata") as string | null;
    const rawMetadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Extract dimensions from form data
    const widthFromForm = formData.get("width");
    const heightFromForm = formData.get("height");
    const durationFromForm = formData.get("duration");

    const metadata = {
      ...rawMetadata,
      width: widthFromForm
        ? parseInt(widthFromForm as string)
        : rawMetadata.width,
      height: heightFromForm
        ? parseInt(heightFromForm as string)
        : rawMetadata.height,
      duration: durationFromForm
        ? parseFloat(durationFromForm as string)
        : rawMetadata.duration,
    };

    // Upload to Convex via HTTP endpoint
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Convex configuration missing");
    }

    const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    // Create multipart form data for Convex HTTP endpoint
    const convexFormData = new FormData();
    convexFormData.append("file", file);
    if (thumbnail instanceof Blob) {
      convexFormData.append("thumbnail", thumbnail);
    }

    const uploadResponse = await fetch(`${convexSiteUrl}/upload`, {
      body: convexFormData,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Convex upload failed (${uploadResponse.status}): ${errorText}`);
    }

    const { storageId, thumbnailStorageId, url, thumbnailUrl } = await uploadResponse.json();

    // Create asset record in database via Convex mutation
    const convexClient = new ConvexHttpClient(convexUrl);
    convexClient.setAuth(token);

    const assetId = await convexClient.mutation(api.assets.uploadAsset, {
      duration: metadata.duration || undefined,
      height: metadata.height || undefined,
      mimeType: file.type,
      originalUrl: undefined,
      sizeBytes: file.size,
      storageId,
      thumbnailStorageId: thumbnailStorageId || undefined,
      type: file.type.startsWith("image/") ? "image" : "video",
      width: metadata.width || undefined,
    });

    // Wrap Convex signed URLs with CORS proxy to enable browser image loading
    // The proxy will fetch from the signed URL and add CORS headers
    const proxyUrl = `/api/storage/proxy?url=${encodeURIComponent(url)}`;
    let thumbnailProxyUrl: string | undefined;
    if (thumbnailUrl) {
      thumbnailProxyUrl = `/api/storage/proxy?url=${encodeURIComponent(thumbnailUrl)}`;
    }

    console.log("[Upload] Created proxy URLs:", { proxyUrl, thumbnailProxyUrl });

    return NextResponse.json({
      assetId,
      sizeBytes: file.size,
      signedUrl: url,
      storageId,
      thumbnailSignedUrl: thumbnailUrl,
      thumbnailStorageId,
      url: proxyUrl,
      thumbnailProxyUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
