/**
 * Convex HTTP actions for file uploads.
 *
 * Handles large file uploads (up to 25MB) via HTTP POST requests.
 * Accepts optional pre-generated thumbnail blob.
 * Returns storage ID and URL for uploaded files.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * HTTP action for uploading files to Convex storage.
 *
 * Accepts multipart/form-data with a file field.
 * Validates file type (image/* or video/*) and stores in Convex.
 *
 * @remarks
 * - Requires authentication via Clerk JWT token
 * - Maximum file size: 25MB (Convex limit)
 * - Supported types: image/*, video/*
 * - Returns storageId and URL for accessing the file
 *
 * @example
 * ```ts
 * const formData = new FormData();
 * formData.append("file", blob);
 *
 * const response = await fetch("/api/upload", {
 *   method: "POST",
 *   body: formData,
 *   headers: {
 *     Authorization: `Bearer ${token}`,
 *   },
 * });
 *
 * const { storageId, url } = await response.json();
 * ```
 */
http.route({
  handler: httpAction(async (ctx, request) => {
    try {
      // SECURITY: Verify authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse multipart form data (file + optional thumbnail)
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof Blob)) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate file size (25MB limit)
      if (file.size > 25 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File too large. Maximum size is 25MB." }),
          {
            status: 413,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validate content type
      const contentType = file.type;
      const isImage = contentType?.startsWith("image/");
      const isVideo = contentType?.startsWith("video/");

      if (contentType && !isImage && !isVideo) {
        return new Response(
          JSON.stringify({
            error: "Unsupported file type. Only images and videos are allowed.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Store full-size file in Convex storage
      const storageId = await ctx.storage.store(file);

      // Get URL for the stored file
      const url = await ctx.storage.getUrl(storageId);

      if (!url) {
        return new Response(
          JSON.stringify({ error: "Failed to get storage URL" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Store optional thumbnail if provided by client (bandwidth optimization)
      let thumbnailStorageId: string | undefined;
      let thumbnailUrl: string | undefined;
      try {
        const thumbnail = formData.get("thumbnail");
        if (thumbnail instanceof Blob && thumbnail.size > 0) {
          thumbnailStorageId = await ctx.storage.store(thumbnail);
          // Get URL for the thumbnail
          if (thumbnailStorageId) {
            const thumbUrl = await ctx.storage.getUrl(thumbnailStorageId);
            if (thumbUrl) {
              thumbnailUrl = thumbUrl;
            }
          }
        }
      } catch (thumbError) {
        // Continue without thumbnail - not critical
      }

      return new Response(
        JSON.stringify({
          storageId,
          thumbnailStorageId,
          url,
          thumbnailUrl,
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Upload failed",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
  method: "POST",
  path: "/upload",
});

export default http;
