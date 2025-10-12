import { NextRequest, NextResponse } from "next/server";
import { createFalClient } from "@fal-ai/client";
import {
  createRateLimiter,
  RateLimiter,
  shouldLimitRequest,
} from "@/lib/ratelimit";
import { checkBotId } from "botid/server";

const limiter: RateLimiter = {
  perMinute: createRateLimiter(5, "60 s"),
  perHour: createRateLimiter(15, "60 m"),
  perDay: createRateLimiter(50, "24 h"),
};

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

    // Check if user has provided their own API key
    const authHeader = req.headers.get("authorization");
    const hasCustomApiKey = authHeader && authHeader.length > 0;

    // Only apply rate limiting if no custom API key is provided
    if (!hasCustomApiKey) {
      const ip = req.headers.get("x-forwarded-for") || "";
      const limiterResult = await shouldLimitRequest(limiter, ip);
      if (limiterResult.shouldLimitRequest) {
        return new Response(
          `Rate limit exceeded per ${limiterResult.period}. Add your FAL API key to bypass rate limits.`,
          {
            status: 429,
            headers: {
              "Content-Type": "text/plain",
              "X-RateLimit-Limit":
                limiterResult.period === "perMinute"
                  ? "5"
                  : limiterResult.period === "perHour"
                    ? "15"
                    : "50",
              "X-RateLimit-Period": limiterResult.period,
            },
          },
        );
      }
    }

    // Get the file from the request body
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to blob
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });

    // Create fal client with API key from environment or user-provided key
    const falClient = createFalClient({
      credentials: hasCustomApiKey 
        ? authHeader?.replace("Bearer ", "")
        : process.env.FAL_KEY,
    });

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
          message: "Add your FAL API key to bypass rate limits."
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}