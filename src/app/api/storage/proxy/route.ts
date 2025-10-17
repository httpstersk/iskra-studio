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
    const storageId = searchParams.get("storageId");
    const mode: ProxyMode = (searchParams.get("mode") as ProxyMode) || "blob";

    if (!storageId) {
      return NextResponse.json(
        { error: "storageId parameter required" },
        { status: 400 }
      );
    }

    // Get the Convex URL from environment
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return NextResponse.json(
        { error: "Convex configuration missing" },
        { status: 500 }
      );
    }

    // Construct storage URLs - try both .convex.cloud and .convex.site
    // The Convex storage API might be available on both domains
    const convexSiteUrl = convexUrl.replace(".convex.cloud", ".convex.site");
    const storageUrlCloud = `${convexUrl}/api/storage/${storageId}`;
    const storageUrlSite = `${convexSiteUrl}/api/storage/${storageId}`;
    
    console.log("[Storage Proxy] Mode:", mode, "| Primary URL:", storageUrlCloud, "| Fallback URL:", storageUrlSite);

    // Fetch the file from Convex storage
    // Try primary URL first, then fallback URL if it fails
    let response;
    let lastError: Error | null = null;
    
    for (const storageUrl of [storageUrlCloud, storageUrlSite]) {
      try {
        console.log("[Storage Proxy] Attempting fetch from:", storageUrl);
        response = await fetch(storageUrl, {
          headers: {
            "Accept": "image/*, video/*, */*",
            "User-Agent": "Spark-Videos-Proxy/1.0",
          },
          // Add timeout
          signal: AbortSignal.timeout(30000),
        });
        
        console.log("[Storage Proxy] Response status:", response.status, response.statusText);
        
        // If we got a response (even if it's an error), break out of the loop
        // We'll handle the error status below
        break;
      } catch (fetchError) {
        console.error("[Storage Proxy] Fetch failed for", storageUrl, ":", fetchError);
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        // Continue to try the next URL
        continue;
      }
    }
    
    if (!response) {
      // Both URLs failed
      console.error("[Storage Proxy] All fetch attempts failed. Last error:", lastError);
      return NextResponse.json(
        { error: "Failed to fetch from Convex storage", details: lastError?.message || "Unknown error" },
        { status: 502 }
      );
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error");
      console.error("[Storage Proxy] Storage error:", response.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch from storage: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    console.log("[Storage Proxy] Content-Type:", contentType);
    
    let buffer;
    try {
      buffer = await response.arrayBuffer();
      console.log("[Storage Proxy] Buffer size:", buffer.byteLength, "bytes");
      
      if (buffer.byteLength === 0) {
        throw new Error("Received empty buffer from Convex storage");
      }
    } catch (bufferError) {
      console.error("[Storage Proxy] Buffer error:", bufferError);
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
      console.log("[Storage Proxy] Returning data URL, length:", dataUrl.length);
      return NextResponse.json({ url: dataUrl, contentType });
    }

    // Default: Return with CORS headers to allow browser image loading
    console.log("[Storage Proxy] Returning image data with CORS headers");
    
    const responseHeaders = new Headers({
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength.toString(),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[Storage Proxy] Unexpected error:", error);
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
