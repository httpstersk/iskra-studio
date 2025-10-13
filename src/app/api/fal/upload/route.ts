import { NextRequest, NextResponse } from "next/server";

import { checkBotId } from "botid/server";

import {
  buildRateLimitHeaders,
  checkRateLimit,
  createServerFalClient,
  extractBearerToken,
  standardLimitHeaders,
  standardRateLimiter,
} from "@/lib/fal/utils";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

/**
 * POST handler for uploading files to fal.ai through server-side proxy
 * This bypasses CORS issues by handling the upload on the server
 */
export async function POST(req: NextRequest) {
  try {
    // Check for bot activity first
    const verification = await checkBotId();
    if (verification.isBot) {
      return new Response("Access denied", { status: 403 });
    }

  // Disallow user-provided FAL API keys via Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    return NextResponse.json(
      { error: "Custom FAL API keys are not accepted." },
      { status: 400 },
    );
  }

  // Always apply rate limiting
  const limiterResult = await checkRateLimit({
    limiter: standardRateLimiter,
    headers: req.headers,
    hasCustomApiKey: false,
  });

    if (limiterResult.shouldLimitRequest) {
      return new Response(
        `Rate limit exceeded per ${limiterResult.period}. Please try again later.`,
        {
          status: 429,
          headers: buildRateLimitHeaders(
            limiterResult.period,
            standardLimitHeaders,
          ),
        },
      );
    }

    // Get the file from the request body
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const mimeType = (file.type || "").toLowerCase();
    const isAllowedType = ALLOWED_MIME_PREFIXES.some((prefix) =>
      mimeType.startsWith(prefix),
    );

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 },
      );
    }

    const blob: Blob = file;

    // Create fal client using server environment key
    const falClient = createServerFalClient();

    // Upload the file server-side
    const uploadResult = await falClient.storage.upload(blob);

    return NextResponse.json({ url: uploadResult });
  } catch (error) {
    console.error("Upload error:", error);

    // Check for rate limit error
    const isRateLimit =
      (error as { status?: number; message?: string }).status === 429 ||
      (error as { message?: string }).message?.includes("429") ||
      (error as { message?: string }).message?.includes("rate limit") ||
      (error as { message?: string }).message?.includes("Rate limit");

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Please try again later.",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
