import {
  buildRateLimitHeaders,
  checkRateLimit,
  standardLimitHeaders,
  standardRateLimiter,
} from "@/lib/fal/utils";
import { uploadFileToConvex } from "@/lib/server/upload-service";
import { auth } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

/**
 * POST handler for uploading files to Convex storage
 * Redirects to the Convex upload endpoint for consistency
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
        { status: 400 }
      );
    }

    // Get userId from Clerk for per-user rate limiting
    const { userId } = await auth();

    // Require authentication for uploads
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Always apply rate limiting (per-user if authenticated, per-IP otherwise)
    const limiterResult = await checkRateLimit({
      limiter: standardRateLimiter,
      headers: req.headers,
      userId: userId ?? undefined,
      limitType: "standard",
    });

    if (limiterResult.shouldLimitRequest) {
      return new Response(
        `Rate limit exceeded per ${limiterResult.period}. Please try again later.`,
        {
          status: 429,
          headers: buildRateLimitHeaders(
            limiterResult.period,
            standardLimitHeaders
          ),
        }
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
      mimeType.startsWith(prefix)
    );

    if (!isAllowedType) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 }
      );
    }

    const blob: Blob = file;

    // Get auth token
    const authData = await auth();
    const token = await authData.getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    // Upload to Convex storage using upload service
    const uploadResult = await uploadFileToConvex({
      authToken: token,
      file: blob,
      metadata: {},
    });

    return NextResponse.json({ url: uploadResult.url });
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
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
