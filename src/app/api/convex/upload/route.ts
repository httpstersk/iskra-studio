/**
 * Convex file upload API route.
 *
 * Handles file uploads to Convex storage with authentication,
 * quota validation, and asset record creation.
 * Accepts optional thumbnail blob for bandwidth optimization.
 */

import {
  uploadFileToConvex,
  type UploadMetadata,
} from "@/lib/server/upload-service";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

// Allow up to 50MB request bodies for file uploads
export const config = {
  maxBodySize: "50mb",
};

/**
 * POST handler for uploading files to Convex storage.
 *
 * Validates authentication, parses form data, and delegates to
 * the upload service for business logic execution.
 *
 * @remarks
 * - Requires Clerk authentication
 * - Supports image/* and video/* MIME types
 * - Maximum file size: 25 MB
 * - Accepts optional thumbnail blob for bandwidth optimization
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append("file", imageBlob);
 * formData.append("thumbnail", thumbnailBlob); // optional
 * formData.append("width", "1024");
 * formData.append("height", "768");
 *
 * const response = await fetch("/api/convex/upload", {
 *   method: "POST",
 *   body: formData,
 * });
 *
 * const result = await response.json();
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const authData = await auth();
    const { userId } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get Convex auth token
    const token = await authData.getToken({ template: "convex" });
    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file");
    const thumbnail = formData.get("thumbnail");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract metadata from form data
    const metadata = extractMetadata(formData);

    // Upload file using service layer
    const result = await uploadFileToConvex({
      authToken: token,
      file,
      metadata,
      thumbnail: thumbnail instanceof Blob ? thumbnail : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Extracts and parses metadata from form data.
 *
 * Combines JSON metadata with individual dimension fields,
 * with individual fields taking precedence.
 *
 * @param formData - Form data from request
 * @returns Parsed metadata object
 */
function extractMetadata(formData: FormData): UploadMetadata {
  // Parse JSON metadata if provided
  const metadataStr = formData.get("metadata") as string | null;
  const rawMetadata = metadataStr ? JSON.parse(metadataStr) : {};

  // Extract individual dimension fields (take precedence over JSON)
  const widthFromForm = formData.get("width");
  const heightFromForm = formData.get("height");
  const durationFromForm = formData.get("duration");

  return {
    ...rawMetadata,
    duration: durationFromForm
      ? parseFloat(durationFromForm as string)
      : rawMetadata.duration,
    height: heightFromForm
      ? parseInt(heightFromForm as string)
      : rawMetadata.height,
    width: widthFromForm
      ? parseInt(widthFromForm as string)
      : rawMetadata.width,
  };
}
