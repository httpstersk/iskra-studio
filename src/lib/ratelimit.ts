import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

export type RateLimiter = {
  perMinute: Ratelimit;
  perHour: Ratelimit;
  perDay: Ratelimit;
};

export const createRateLimiter = (tokens: number, window: string) => {
  return new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(tokens, window as any),
    analytics: false,
  });
};

type LimitPeriod = "perMinute" | "perHour" | "perDay";

export const RATE_LIMIT_PERIOD_LABELS: Record<LimitPeriod, string> = {
  perMinute: "minute",
  perHour: "hour",
  perDay: "day",
};

type LimitResult =
  | {
      shouldLimitRequest: false;
    }
  | { shouldLimitRequest: true; period: LimitPeriod };

export const IS_RATE_LIMITER_ENABLED =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

// In-memory rate limiter for development/fallback when KV is not configured
interface RateLimitEntry {
  timestamps: number[];
}

const inMemoryStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up every hour

// Periodically clean up old entries to prevent memory leaks
if (typeof window === "undefined") {
  // Only run cleanup on server
  setInterval(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    for (const [key, entry] of inMemoryStore.entries()) {
      // Remove timestamps older than 24 hours
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < oneDay);
      // Remove entry if no recent timestamps
      if (entry.timestamps.length === 0) {
        inMemoryStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

function checkInMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = inMemoryStore.get(key) || { timestamps: [] };

  // Filter out timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  // Check if limit exceeded
  if (entry.timestamps.length >= limit) {
    return false; // Rate limited
  }

  // Add current timestamp
  entry.timestamps.push(now);
  inMemoryStore.set(key, entry);

  return true; // Allow request
}

export async function shouldLimitRequest(
  limiter: RateLimiter,
  ip: string,
  keyPrefix?: string,
): Promise<LimitResult> {
  // Use different keys for different types of rate limits
  const rateLimitKey = keyPrefix ? `${keyPrefix}:${ip}` : ip;

  if (!IS_RATE_LIMITER_ENABLED) {
    // Fallback to in-memory rate limiting for development/when KV not configured
    // Using conservative limits for security
    const limits = [
      { period: "perMinute" as const, tokens: 20, windowMs: 60 * 1000 },
      { period: "perHour" as const, tokens: 100, windowMs: 60 * 60 * 1000 },
      { period: "perDay" as const, tokens: 500, windowMs: 24 * 60 * 60 * 1000 },
    ];

    for (const limit of limits) {
      const key = `${rateLimitKey}:${limit.period}`;
      const allowed = checkInMemoryRateLimit(key, limit.tokens, limit.windowMs);
      if (!allowed) {
        return { shouldLimitRequest: true, period: limit.period };
      }
    }

    return { shouldLimitRequest: false };
  }

  const limits = ["perMinute", "perHour", "perDay"] as const;
  const results = await Promise.all(
    limits.map(async (limit) => {
      const result = await limiter[limit].limit(rateLimitKey);
      return result;
    }),
  );

  const limitRequestIndex = results.findIndex((result) => !result.success);
  const shouldLimit = limitRequestIndex >= 0;

  return {
    shouldLimitRequest: shouldLimit,
    period: limits[limitRequestIndex],
  };
}
