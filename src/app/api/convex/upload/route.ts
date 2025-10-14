/**
 * Convex file upload API route.
 *
 * Handles file uploads to Convex storage with authentication,
 * quota validation, and asset record creation.
 */

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";

import type { AssetUploadResult } from "@/types/asset";
import { api } from "../../../../../convex/_generated/api";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB (Convex limit)
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the file from the request body
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25 MB." },
        { status: 413 }
      );
    }

    // Validate MIME type
    const mimeType = (file.type || "").toLowerCase();
    const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) =>
      mimeType.startsWith(prefix)
    );

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Unsupported file type. Only images and videos are allowed." },
        { status: 415 }
      );
    }

    // Determine asset type from MIME type
    const assetType: "image" | "video" = mimeType.startsWith("image/")
      ? "image"
      : "video";

    // TODO: Check user's storage quota before upload
    // This requires fetching user data from Convex
    // For now, we'll proceed with the upload and let the mutation handle quota enforcement

    // Get Convex deployment URL
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex configuration missing" },
        { status: 500 }
      );
    }

    // Upload file to Convex storage via HTTP action
    // Send as raw blob, not FormData
    const blob = await file.arrayBuffer();

    const uploadResponse = await fetch(`${convexUrl}/upload`, {
      body: blob,
      method: "POST",
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Convex upload failed:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorText,
        uploadUrl: `${convexUrl}/upload`,
      });
      throw new Error(
        `Convex upload failed (${uploadResponse.status}): ${errorText}`
      );
    }

    const { storageId, url } = await uploadResponse.json();

    // Create asset record in database via Convex mutation
    const convexClient = new ConvexHttpClient(convexUrl);

    // Set auth token for the mutation
    const authData = await auth();
    const token = await authData.getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    convexClient.setAuth(token);

    // Extract metadata from form data if provided
    const metadataStr = formData.get("metadata") as string | null;
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Get image/video dimensions if provided
    const width = formData.get("width");
    const height = formData.get("height");
    const duration = formData.get("duration");

    // Call uploadAsset mutation to create database record
    const assetId = await convexClient.mutation(api.assets.uploadAsset, {
      duration: duration ? parseFloat(duration as string) : undefined,
      height: height ? parseInt(height as string) : undefined,
      metadata: metadata || {},
      mimeType,
      sizeBytes: file.size,
      storageId,
      type: assetType,
      userId,
      width: width ? parseInt(width as string) : undefined,
    });

    const result: AssetUploadResult = {
      assetId: assetId as string,
      sizeBytes: file.size,
      storageId,
      url,
    };

    return NextResponse.json(result);
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
