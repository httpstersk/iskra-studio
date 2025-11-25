/**
 * Helper functions for tRPC procedures that use FAL.ai.
 *
 * @remarks
 * This module provides convenience functions specifically for tRPC procedure contexts,
 * combining rate limiting, client resolution, and response handling.
 */

import type { FalClient } from "@fal-ai/client";
import {
  resolveFalClient,
  standardRateLimiter,
  videoRateLimiter,
  type LimitPeriod,
} from "./rate-limit";
import type { RequestLike } from "./types";

// Re-export response utilities for convenience
export { extractFalErrorMessage, extractResultData } from "./response";

/**
 * Converts a multi-line prompt string into a single line by collapsing all
 * whitespace runs (including newlines and tabs) into single spaces.
 */
const RE_WHITESPACE = /\s+/g;
const SINGLE_SPACE = " ";

export function toSingleLinePrompt(input: string): string {
  return input.replace(RE_WHITESPACE, SINGLE_SPACE).trim();
}

/**
 * Resolves an authenticated FAL client instance with rate limiting applied.
 *
 * This is a convenience wrapper for tRPC procedures that automatically handles
 * rate limiting and returns an appropriate error message on limit exhaustion.
 *
 * @param ctx - tRPC context containing request and optional userId from Clerk
 * @param isVideo - Whether the request should use video rate limits
 * @returns A FAL client configured for the current request
 * @throws Error when the active rate limit bucket is exhausted
 */
export async function getFalClient(
  ctx: { req?: RequestLike; userId?: string },
  isVideo: boolean = false,
): Promise<FalClient> {
  const headersSource =
    ctx.req?.headers instanceof Headers ? ctx.req.headers : ctx.req?.headers;

  const resolved = await resolveFalClient({
    limiter: isVideo ? videoRateLimiter : standardRateLimiter,
    headers: headersSource,
    bucketId: isVideo ? "video" : undefined,
    fallbackIp: typeof ctx.req?.ip === "string" ? ctx.req.ip : undefined,
    userId: ctx.userId,
    limitType: isVideo ? "video" : "standard",
  });

  if (resolved.limited) {
    const errorMessage = isVideo
      ? `Video generation rate limit exceeded: 1 video per ${resolved.period}.`
      : `Rate limit exceeded per ${resolved.period}.`;
    throw new Error(errorMessage);
  }

  return resolved.client;
}
