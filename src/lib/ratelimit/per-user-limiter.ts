import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

/**
 * Rate limit periods for user-based rate limiting.
 */
export type LimitPeriod = "perMinute" | "perHour" | "perDay";

/**
 * Rate limiter with per-minute, per-hour, and per-day limits.
 */
export type UserRateLimiter = {
  perMinute: Ratelimit;
  perHour: Ratelimit;
  perDay: Ratelimit;
};

/**
 * Type of operation being rate limited.
 */
export type LimitType = "standard" | "video";

/**
 * Result of rate limit check.
 */
export type UserRateLimitResult =
  | {
      shouldLimitRequest: false;
    }
  | { shouldLimitRequest: true; period: LimitPeriod };

/**
 * Configuration for rate limits by period.
 */
type RateLimitConfig = Record<
  LimitPeriod,
  {
    tokens: number;
    window: string;
  }
>;

/**
 * Standard rate limits for image generation and uploads.
 * - 5 requests per minute
 * - 15 requests per hour
 * - 50 requests per day
 */
export const STANDARD_RATE_LIMITS: RateLimitConfig = {
  perMinute: { tokens: 5, window: "60 s" },
  perHour: { tokens: 15, window: "60 m" },
  perDay: { tokens: 50, window: "24 h" },
};

/**
 * Video generation rate limits (more restrictive).
 * - 2 requests per minute
 * - 4 requests per hour
 * - 8 requests per day
 */
export const VIDEO_RATE_LIMITS: RateLimitConfig = {
  perMinute: { tokens: 2, window: "60 s" },
  perHour: { tokens: 4, window: "60 m" },
  perDay: { tokens: 8, window: "24 h" },
};

/**
 * Human-readable labels for rate limit periods.
 */
export const RATE_LIMIT_PERIOD_LABELS: Record<LimitPeriod, string> = {
  perMinute: "minute",
  perHour: "hour",
  perDay: "day",
};

/**
 * Check if rate limiting is enabled (requires Vercel KV credentials).
 */
export const IS_RATE_LIMITER_ENABLED =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

/**
 * Creates a single rate limiter with specified tokens and window.
 *
 * @param tokens - Number of requests allowed in the window
 * @param window - Time window (e.g., "60 s", "60 m", "24 h")
 * @returns Configured Ratelimit instance
 *
 * @example
 * ```ts
 * const limiter = createUserRateLimiter(5, "60 s");
 * ```
 */
function createUserRateLimiter(tokens: number, window: string): Ratelimit {
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    analytics: false,
    prefix: "user_ratelimit",
  });
}

/**
 * Creates a complete set of rate limiters (minute, hour, day) from config.
 *
 * @param config - Rate limit configuration object
 * @returns UserRateLimiter with all three period limiters
 *
 * @example
 * ```ts
 * const limiter = createUserRateLimiterSet(STANDARD_RATE_LIMITS);
 * ```
 */
function createUserRateLimiterSet(config: RateLimitConfig): UserRateLimiter {
  return {
    perMinute: createUserRateLimiter(
      config.perMinute.tokens,
      config.perMinute.window,
    ),
    perHour: createUserRateLimiter(
      config.perHour.tokens,
      config.perHour.window,
    ),
    perDay: createUserRateLimiter(config.perDay.tokens, config.perDay.window),
  };
}

/**
 * Standard rate limiter instance for image generation and uploads.
 */
export const standardUserRateLimiter =
  createUserRateLimiterSet(STANDARD_RATE_LIMITS);

/**
 * Video rate limiter instance for video generation operations.
 */
export const videoUserRateLimiter = createUserRateLimiterSet(VIDEO_RATE_LIMITS);

/**
 * Checks if a user has exceeded their rate limit for a given operation type.
 *
 * @param userId - Clerk user ID to check rate limit for
 * @param limitType - Type of operation: "standard" or "video"
 * @returns Promise resolving to rate limit result indicating if request should be blocked
 *
 * @example
 * ```ts
 * const result = await checkUserRateLimit("user_123", "standard");
 * ```
 */
export async function checkUserRateLimit(
  userId: string,
  limitType: LimitType = "standard",
): Promise<UserRateLimitResult> {
  if (!IS_RATE_LIMITER_ENABLED) {
    return { shouldLimitRequest: false };
  }

  const limiter =
    limitType === "video" ? videoUserRateLimiter : standardUserRateLimiter;

  // Use userId as the rate limit key with operation type prefix
  const rateLimitKey = `${limitType}:${userId}`;

  const limits: LimitPeriod[] = ["perMinute", "perHour", "perDay"];
  const results = await Promise.all(
    limits.map(async (limit) => {
      const result = await limiter[limit].limit(rateLimitKey);
      return result;
    }),
  );

  const limitRequestIndex = results.findIndex((result) => !result.success);
  const shouldLimit = limitRequestIndex >= 0;

  if (shouldLimit) {
    return {
      shouldLimitRequest: true,
      period: limits[limitRequestIndex],
    };
  }

  return { shouldLimitRequest: false };
}

/**
 * Gets the rate limit configuration for a given limit type.
 *
 * @param limitType - Type of operation: "standard" or "video"
 * @returns Rate limit configuration object
 *
 * @example
 * ```ts
 * const config = getRateLimitConfig("video");
 * ```
 */
export function getRateLimitConfig(limitType: LimitType): RateLimitConfig {
  return limitType === "video" ? VIDEO_RATE_LIMITS : STANDARD_RATE_LIMITS;
}

/**
 * Formats a rate limit period into a human-readable string.
 *
 * @param period - Rate limit period
 * @returns Human-readable period label
 *
 * @example
 * ```ts
 * formatRateLimitPeriod("perMinute"); // "minute"
 * ```
 */
export function formatRateLimitPeriod(period: LimitPeriod): string {
  return RATE_LIMIT_PERIOD_LABELS[period];
}
