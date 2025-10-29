/**
 * Image/video storage proxy API route.
 *
 * Proxies Convex storage URLs through this API to add proper CORS headers,
 * enabling browsers to load images via the Image API with crossOrigin="anonymous".
 *
 * Convex storage URLs don't include CORS headers by default, causing image loads to fail.
 * This route fetches the resource from Convex and returns it with proper CORS headers.
 *
 * @example
 * GET /api/storage/proxy?storageId=abc123
 * Returns the file from Convex with Access-Control-Allow-Origin: *
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Mode for the proxy - determines how the response is returned
 * "blob" = return raw image data with CORS headers (default)
 * "data-url" = return as JSON with base64 data URL (for debugging)
 */
type ProxyMode = "blob" | "data-url";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const providedUrl = searchParams.get("url");
    const storageId = searchParams.get("storageId");
    const mode: ProxyMode = (searchParams.get("mode") as ProxyMode) || "blob";

    // Accept either a signed URL or a storageId
    if (!providedUrl && !storageId) {
      return NextResponse.json(
        { error: "Either 'url' or 'storageId' parameter required" },
        { status: 400 }
      );
    }

    let storageUrl: string;

    if (providedUrl) {
      // Use the provided signed URL directly
      storageUrl = providedUrl;
    } else if (storageId) {
      // Legacy support: construct URL from storageId (less reliable)
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        return NextResponse.json(
          { error: "Convex configuration missing" },
          { status: 500 }
        );
      }

      // Note: constructing URLs directly from storageId is deprecated
      // Prefer using signed URLs from ctx.storage.getUrl()
      const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
      const storageUrlCloud = `${convexUrl}/api/storage/${storageId}`;
      const storageUrlSite = `${convexSiteUrl}/api/storage/${storageId}`;

      // Try primary URL first, then fallback
      let foundUrl: string | null = null;
      let lastError: Error | null = null;

      for (const url of [storageUrlCloud, storageUrlSite]) {
        try {
          const testResponse = await fetch(url, {
            headers: {
              Accept: "image/*, video/*, */*",
              "User-Agent": "Spark-Videos-Proxy/1.0",
            },
            signal: AbortSignal.timeout(30000),
          });

          if (testResponse.ok) {
            foundUrl = url;
            break;
          }
        } catch (fetchError) {
          lastError =
            fetchError instanceof Error
              ? fetchError
              : new Error(String(fetchError));
          continue;
        }
      }

      if (!foundUrl) {
        return NextResponse.json(
          {
            error: "Failed to fetch from storage",
            details: lastError?.message || "Unknown error",
          },
          { status: 502 }
        );
      }

      storageUrl = foundUrl;
    } else {
      // Should never happen due to earlier check, but satisfy TypeScript
      return NextResponse.json(
        { error: "Either 'url' or 'storageId' parameter required" },
        { status: 400 }
      );
    }

    // Fetch the file from the storage URL (signed or constructed)
    let response;
    try {
      response = await fetch(storageUrl, {
        headers: {
          Accept: "image/*, video/*, */*",
          "User-Agent": "Spark-Videos-Proxy/1.0",
        },
        signal: AbortSignal.timeout(30000),
      });
    } catch (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch from storage", details: String(fetchError) },
        { status: 502 }
      );
    }

    if (!response) {
      return NextResponse.json(
        { error: "Failed to fetch from storage" },
        { status: 502 }
      );
    }

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => "Unable to read error");

      return NextResponse.json(
        {
          error: `Failed to fetch from storage: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    let buffer;
    try {
      buffer = await response.arrayBuffer();

      if (buffer.byteLength === 0) {
        throw new Error("Received empty buffer from Convex storage");
      }
    } catch (bufferError) {
      return NextResponse.json(
        { error: "Failed to process file", details: String(bufferError) },
        { status: 500 }
      );
    }

    // Handle different response modes
    if (mode === "data-url") {
      // Debug mode: return as data URL in JSON (for testing)
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;

      return NextResponse.json({ url: dataUrl, contentType });
    }

    const responseHeaders = new Headers({
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Content-Type",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": buffer.byteLength.toString(),
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Storage proxy failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
