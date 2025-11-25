/**
 * Convex file upload API route.
 *
 * Handles file uploads to Convex storage with authentication,
 * quota validation, and asset record creation.
 * Accepts optional thumbnail blob for bandwidth optimization.
 */

import { requireAuth } from "@/lib/api/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/api/error-response";
import { isErr, tryPromise } from "@/lib/errors/safe-errors";
import {
  uploadFileToConvex,
  type UploadMetadata,
} from "@/lib/server/upload-service";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

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
  // Authenticate user and get Convex token
  const authResult = await tryPromise(requireAuth());

  if (isErr(authResult)) {
    return createErrorResponse(authResult, "Authentication failed");
  }

  const { convexToken } = authResult;

  // Parse form data
  const formDataResult = await tryPromise(req.formData());

  if (isErr(formDataResult)) {
    return createErrorResponse(formDataResult, "Failed to parse form data");
  }

  const formData = formDataResult;
  const file = formData.get("file");
  const thumbnail = formData.get("thumbnail");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Extract metadata from form data
  const metadata = extractMetadata(formData);

  // Upload file using service layer
  const result = await tryPromise(
    uploadFileToConvex({
      authToken: convexToken,
      file,
      metadata,
      thumbnail: thumbnail instanceof Blob ? thumbnail : undefined,
    }),
  );

  if (isErr(result)) {
    return createErrorResponse(result, "Upload failed");
  }

  return createSuccessResponse(result);
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
