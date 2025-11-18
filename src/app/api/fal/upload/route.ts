import {
  buildRateLimitHeaders,
  checkRateLimit,
  standardLimitHeaders,
  standardRateLimiter,
} from "@/lib/fal/utils";
import { uploadFileToConvex } from "@/lib/server/upload-service";
import { auth } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";
import { fileTypeFromBuffer } from "file-type";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

// Allowed MIME types based on magic numbers (actual file content)
const ALLOWED_MIME_TYPES = [
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
];

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

    // First check: MIME type from client (basic filter)
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

    // Second check: Magic number validation (verify actual file content)
    // This prevents file type spoofing attacks
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Verify file type by reading magic numbers from file header
    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType) {
      return NextResponse.json(
        {
          error:
            "Unable to determine file type. File may be corrupted or invalid.",
        },
        { status: 415 }
      );
    }

    // Check if detected type matches allowed types
    if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return NextResponse.json(
        {
          error: `Invalid file type detected. Expected image or video, got ${detectedType.mime}`,
        },
        { status: 415 }
      );
    }

    // Additional check: verify claimed MIME type roughly matches detected type
    const detectedCategory = detectedType.mime.split("/")[0]; // "image" or "video"
    const claimedCategory = mimeType.split("/")[0]; // "image" or "video"

    if (detectedCategory !== claimedCategory) {
      return NextResponse.json(
        {
          error: `File type mismatch. Claimed type: ${mimeType}, detected type: ${detectedType.mime}`,
        },
        { status: 415 }
      );
    }

    // Reject SVG files to prevent XSS attacks
    if (detectedType.mime === "image/svg+xml" || file.name.endsWith(".svg")) {
      return NextResponse.json(
        { error: "SVG files are not allowed for security reasons" },
        { status: 415 }
      );
    }

    // Create blob from the already-read buffer
    const blob: Blob = new Blob([buffer], { type: detectedType.mime });

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
