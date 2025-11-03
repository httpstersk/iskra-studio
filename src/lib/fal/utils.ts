import { createFalClient, type FalClient } from "@fal-ai/client";

import {
  createRateLimiter,
  shouldLimitRequest,
  type RateLimiter,
} from "@/lib/ratelimit";
import {
  checkUserRateLimit,
  type LimitType,
  type UserRateLimitResult,
} from "@/lib/ratelimit/per-user-limiter";

import {
  FAL_PROXY_PATH,
  STANDARD_RATE_LIMITS,
  VIDEO_RATE_LIMITS,
} from "./constants";

type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined
  | null;

type LimitPeriod = "perMinute" | "perHour" | "perDay";

type RateLimitConfigEntry = {
  tokens: number;
  window: string;
  header: string;
};

type RateLimitConfig = Record<LimitPeriod, RateLimitConfigEntry>;

type LimitHeaders = Record<LimitPeriod, string>;

type RateLimitCheck =
  | { shouldLimitRequest: false }
  | { shouldLimitRequest: true; period: LimitPeriod };

export const { limiter: standardRateLimiter, headers: standardLimitHeaders } =
  createFalRateLimiter(STANDARD_RATE_LIMITS);

export const { limiter: videoRateLimiter, headers: videoLimitHeaders } =
  createFalRateLimiter(VIDEO_RATE_LIMITS);

export function extractBearerToken(
  authHeader: string | null,
): string | undefined {
  if (!authHeader) return undefined;
  const match = authHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return undefined;
  const token = match[1].trim();
  if (!token || /[\r\n]/.test(token)) {
    return undefined;
  }
  return token;
}

export function hasCustomApiKey(authHeader: string | null): boolean {
  return Boolean(extractBearerToken(authHeader));
}

export function ensureDefaultFalKey(): string {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY environment variable is not set");
  }
  return key;
}

export function createProxyFalClient(): FalClient {
  return createFalClient({
    proxyUrl: FAL_PROXY_PATH,
  });
}

let defaultServerClient: FalClient | null = null;

function getDefaultServerClient(): FalClient {
  if (!defaultServerClient) {
    const key = ensureDefaultFalKey();
    defaultServerClient = createFalClient({
      credentials: () => key,
    });
  }
  return defaultServerClient;
}

export function createServerFalClient(): FalClient {
  return getDefaultServerClient();
}

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

  return { client: getDefaultServerClient(), limited: false };
}

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
