import type { Duration } from "@upstash/ratelimit";
import type { FalClient } from "@fal-ai/client";
import {
  createRateLimiter,
  shouldLimitRequest,
  type RateLimiter,
} from "@/lib/ratelimit";
import {
  checkUserRateLimit,
  type LimitType,
} from "@/lib/ratelimit/per-user-limiter";
import { STANDARD_RATE_LIMITS, VIDEO_RATE_LIMITS } from "./constants";
import { getDefaultClient } from "./client";

export type LimitPeriod = "perMinute" | "perHour" | "perDay";

type RateLimitConfigEntry = {
  tokens: number;
  window: Duration;
  header: string;
};

type RateLimitConfig = Record<LimitPeriod, RateLimitConfigEntry>;

type LimitHeaders = Record<LimitPeriod, string>;

type RateLimitCheck =
  | { shouldLimitRequest: false }
  | { shouldLimitRequest: true; period: LimitPeriod };

type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined
  | null;

/**
 * Creates rate limiter instances and headers from a configuration.
 */
function createFalRateLimiter(config: RateLimitConfig): {
  limiter: RateLimiter;
  headers: LimitHeaders;
} {
  return {
    limiter: {
      perMinute: createRateLimiter(
        config.perMinute.tokens,
        config.perMinute.window,
      ),
      perHour: createRateLimiter(config.perHour.tokens, config.perHour.window),
      perDay: createRateLimiter(config.perDay.tokens, config.perDay.window),
    },
    headers: {
      perMinute: config.perMinute.header,
      perHour: config.perHour.header,
      perDay: config.perDay.header,
    },
  };
}

export const { limiter: standardRateLimiter, headers: standardLimitHeaders } =
  createFalRateLimiter(STANDARD_RATE_LIMITS);

export const { limiter: videoRateLimiter, headers: videoLimitHeaders } =
  createFalRateLimiter(VIDEO_RATE_LIMITS);

/**
 * Extracts client IP from request headers with fallback support.
 */
export function getClientIp(headers: HeaderSource, fallback?: string): string {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || forwarded.trim();
  }

  const realIp = readHeader(headers, "x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return fallback || "unknown";
}

/**
 * Builds rate limit headers for error responses.
 */
export function buildRateLimitHeaders(
  period: LimitPeriod,
  headers: LimitHeaders,
) {
  return {
    "X-RateLimit-Limit": headers[period],
    "X-RateLimit-Period": period,
    "Content-Type": "text/plain",
  };
}

/**
 * Checks if a request should be rate limited.
 */
export async function checkRateLimit({
  limiter,
  headers,
  bucketId,
  fallbackIp,
  userId,
  limitType = "standard",
}: {
  limiter: RateLimiter;
  headers: HeaderSource;
  bucketId?: string;
  fallbackIp?: string;
  userId?: string;
  limitType?: LimitType;
}): Promise<RateLimitCheck> {
  // If userId is provided, use per-user rate limiting
  if (userId) {
    return checkUserRateLimit(userId, limitType);
  }

  // Otherwise, fall back to IP-based rate limiting
  const ip = getClientIp(headers, fallbackIp);
  return shouldLimitRequest(limiter, ip, bucketId);
}

/**
 * Resolves a FAL client with rate limiting applied.
 */
export async function resolveFalClient({
  limiter,
  headers,
  bucketId,
  fallbackIp,
  userId,
  limitType,
}: {
  limiter: RateLimiter;
  headers: HeaderSource;
  bucketId?: string;
  fallbackIp?: string;
  userId?: string;
  limitType?: LimitType;
}): Promise<
  { client: FalClient; limited: false } | { limited: true; period: LimitPeriod }
> {
  const rateLimit = await checkRateLimit({
    limiter,
    headers,
    bucketId,
    fallbackIp,
    userId,
    limitType,
  });

  if (rateLimit.shouldLimitRequest) {
    return { limited: true, period: rateLimit.period };
  }

  return { client: getDefaultClient(), limited: false };
}

/**
 * Reads a header value from various header source types.
 */
function readHeader(source: HeaderSource, key: string): string | undefined {
  if (!source) return undefined;
  if (source instanceof Headers) {
    return source.get(key) || undefined;
  }

  const record = source as Record<string, string | string[] | undefined>;
  const direct = record[key] ?? record[key.toLowerCase()];
  if (Array.isArray(direct)) {
    return direct[0];
  }
  return direct;
}
