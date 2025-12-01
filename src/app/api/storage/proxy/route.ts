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

import { createErrorResponse } from "@/lib/api/error-response";
import {
  getErrorMessage,
  isErr,
  tryPromise,
  trySync,
} from "@/lib/errors/safe-errors";
import { NextRequest, NextResponse } from "next/server";

/**
 * Mode for the proxy - determines how the response is returned
 * "blob" = return raw image data with CORS headers (default)
 * "data-url" = return as JSON with base64 data URL (for debugging)
 */
type ProxyMode = "blob" | "data-url";

export async function GET(req: NextRequest) {
  const urlResult = trySync(() => new URL(req.url));
  if (isErr(urlResult)) {
    return createErrorResponse(urlResult, "Invalid request URL");
  }
  const { searchParams } = urlResult;
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

  // Validate URL origin if provided URL - only allow Convex URLs
  if (providedUrl) {
    const urlObjResult = trySync(() => new URL(providedUrl));

    if (isErr(urlObjResult)) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const urlObj = urlObjResult;

    // Enforce HTTPS protocol
    if (urlObj.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTPS URLs are allowed" },
        { status: 403 }
      );
    }

    // Build strict whitelist from environment variables
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const convexSiteUrl = process.env.CONVEX_SITE_URL;

    const allowedHosts: string[] = [];

    if (convexUrl) {
      const convexHostnameResult = trySync(() => new URL(convexUrl).hostname);
      if (!isErr(convexHostnameResult)) {
        allowedHosts.push(convexHostnameResult);
      }
    }

    if (convexSiteUrl) {
      const siteHostnameResult = trySync(() => new URL(convexSiteUrl).hostname);
      if (!isErr(siteHostnameResult)) {
        allowedHosts.push(siteHostnameResult);
      }
    }

    // Fallback: if no env vars configured, deny all external URLs
    if (allowedHosts.length === 0) {
      return NextResponse.json(
        { error: "Convex storage not configured" },
        { status: 500 }
      );
    }

    // Strict hostname matching (exact match only, no subdomains)
    const isAllowed = allowedHosts.includes(urlObj.hostname);

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: "Invalid URL origin. Only Convex storage URLs are allowed.",
        },
        { status: 403 }
      );
    }

    // Prevent URL manipulation attacks
    if (urlObj.username || urlObj.password) {
      return NextResponse.json(
        { error: "URLs with credentials are not allowed" },
        { status: 403 }
      );
    }
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
      const testResponseResult = await tryPromise(
        fetch(url, {
          headers: {
            Accept: "image/*, video/*, */*",
            "User-Agent": "Iskra-Studio-Proxy/1.0",
          },
          signal: AbortSignal.timeout(30000),
        })
      );

      if (isErr(testResponseResult)) {
        const err = testResponseResult.payload;
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const testResponse = testResponseResult;

      if (testResponse.ok) {
        foundUrl = url;
        break;
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
  const responseResult = await tryPromise(
    fetch(storageUrl, {
      headers: {
        Accept: "image/*, video/*, */*",
        "User-Agent": "Iskra-Studio-Proxy/1.0",
      },
      signal: AbortSignal.timeout(30000),
    })
  );

  if (isErr(responseResult)) {
    return NextResponse.json(
      {
        error: "Failed to fetch from storage",
        details: getErrorMessage(responseResult),
      },
      { status: 502 }
    );
  }

  const response = responseResult;

  if (!response.ok) {
    const errorTextResult = await tryPromise(response.text());
    const errorText = isErr(errorTextResult)
      ? "Unable to read error"
      : errorTextResult;

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

  const bufferResult = await tryPromise(response.arrayBuffer());

  if (isErr(bufferResult)) {
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: getErrorMessage(bufferResult),
      },
      { status: 500 }
    );
  }

  const buffer = bufferResult;

  if (buffer.byteLength === 0) {
    return NextResponse.json(
      {
        error: "Failed to process file",
        details: "Received empty buffer from Convex storage",
      },
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

  // Restrict CORS to application domain only
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOriginResult = trySync(() => new URL(appUrl).origin);
  const allowedOrigin = isErr(allowedOriginResult)
    ? "http://localhost:3000"
    : allowedOriginResult;

  const responseHeaders = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Content-Type",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Length": buffer.byteLength.toString(),
    "Content-Type": contentType,
    "Cross-Origin-Resource-Policy": "same-site",
  });

  return new NextResponse(buffer, {
    status: 200,
    headers: responseHeaders,
  });
}

export async function OPTIONS() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const allowedOrigin = new URL(appUrl).origin;

  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
    },
  });
}
