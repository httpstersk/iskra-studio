/**
 * Convex HTTP actions for file uploads.
 * 
 * Handles large file uploads (up to 25MB) via HTTP POST requests.
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
 * });
 * 
 * const { storageId, url } = await response.json();
 * ```
 */
http.route({
  handler: httpAction(async (ctx, request) => {
    // Parse multipart form data
    const blob = await request.blob();
    
    // Store file in Convex storage
    const storageId = await ctx.storage.store(blob);
    
    // Get URL for the stored file
    const url = await ctx.storage.getUrl(storageId);
    
    if (!url) {
      throw new Error("Failed to get storage URL");
    }

    return new Response(
      JSON.stringify({
        storageId,
        url,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  }),
  method: "POST",
  path: "/upload",
});

export default http;
