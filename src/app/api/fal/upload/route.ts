import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import {
  buildRateLimitHeaders,
  checkRateLimit,
  standardLimitHeaders,
  standardRateLimiter,
} from "@/lib/fal/utils";
import { logger } from "@/lib/logger";
import { uploadFileToConvex } from "@/lib/server/upload-service";
import { auth } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";
import { fileTypeFromBuffer } from "file-type";
import { NextRequest, NextResponse } from "next/server";

const log = logger.upload;

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
  // Check for bot activity first
  const verificationResult = await tryPromise(checkBotId());

  if (isErr(verificationResult)) {
    // Fail closed if bot check fails? Or open?
    // Assuming fail closed for security.
    return new Response("Access denied", { status: 403 });
  }

  const verification = verificationResult;

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

  // Get userId from Clerk for per-user rate limiting
  const authResult = await tryPromise(auth());

  if (isErr(authResult)) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  const { userId } = authResult;

  // Require authentication for uploads
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Always apply rate limiting (per-user if authenticated, per-IP otherwise)
  const limiterResult = await tryPromise(
    checkRateLimit({
      limiter: standardRateLimiter,
      headers: req.headers,
      userId: userId ?? undefined,
      limitType: "standard",
    }),
  );

  if (isErr(limiterResult)) {
    log.error("Rate limit check failed", getErrorMessage(limiterResult));
  } else if (limiterResult.shouldLimitRequest) {
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
  const formDataResult = await tryPromise(req.formData());

  if (isErr(formDataResult)) {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 },
    );
  }

  const formData = formDataResult;
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
    mimeType.startsWith(prefix),
  );

  if (!isAllowedType) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 415 },
    );
  }

  // Second check: Magic number validation (verify actual file content)
  // This prevents file type spoofing attacks
  const arrayBufferResult = await tryPromise(file.arrayBuffer());

  if (isErr(arrayBufferResult)) {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }

  const arrayBuffer = arrayBufferResult;
  const buffer = new Uint8Array(arrayBuffer);

  // Verify file type by reading magic numbers from file header
  const detectedTypeResult = await tryPromise(fileTypeFromBuffer(buffer));

  if (isErr(detectedTypeResult)) {
    return NextResponse.json(
      { error: "Failed to detect file type" },
      { status: 500 },
    );
  }

  const detectedType = detectedTypeResult;

  if (!detectedType) {
    return NextResponse.json(
      {
        error:
          "Unable to determine file type. File may be corrupted or invalid.",
      },
      { status: 415 },
    );
  }

  // Check if detected type matches allowed types
  if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
    return NextResponse.json(
      {
        error: `Invalid file type detected. Expected image or video, got ${detectedType.mime}`,
      },
      { status: 415 },
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
      { status: 415 },
    );
  }

  // Reject SVG files to prevent XSS attacks
  if (detectedType.mime === "image/svg+xml" || file.name.endsWith(".svg")) {
    return NextResponse.json(
      { error: "SVG files are not allowed for security reasons" },
      { status: 415 },
    );
  }

  // Create blob from the already-read buffer
  const blob: Blob = new Blob([buffer], { type: detectedType.mime });

  // Get auth token
  const authDataResult = await tryPromise(auth());

  if (isErr(authDataResult)) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  const authData = authDataResult;

  const tokenResult = await tryPromise(
    authData.getToken({ template: "convex" }),
  );

  if (isErr(tokenResult)) {
    return NextResponse.json(
      { error: "Failed to get auth token" },
      { status: 401 },
    );
  }

  const token = tokenResult;

  if (!token) {
    return NextResponse.json(
      { error: "Failed to get auth token" },
      { status: 401 },
    );
  }

  // Upload to Convex storage using upload service
  const uploadResult = await tryPromise(
    uploadFileToConvex({
      authToken: token,
      file: blob,
      metadata: {},
    }),
  );

  if (isErr(uploadResult)) {
    const error = uploadResult.payload;
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
        message: getErrorMessage(uploadResult),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: uploadResult.url });
}
