/**
 * FAL.ai utility functions.
 *
 * @remarks
 * This module serves as the main entry point for FAL utilities.
 * It re-exports functions from specialized modules for backward compatibility
 * and convenience.
 */

// Re-export authentication utilities
export {
  extractBearerToken,
  hasCustomApiKey,
} from "./auth";

// Re-export client creation utilities
export {
  createProxyFalClient,
  createServerFalClient,
  ensureDefaultFalKey,
} from "./client";

// Re-export rate limiting utilities
export {
  buildRateLimitHeaders,
  checkRateLimit,
  getClientIp,
  resolveFalClient,
  standardLimitHeaders,
  standardRateLimiter,
  videoLimitHeaders,
  videoRateLimiter,
  type LimitPeriod,
} from "./rate-limit";

// Re-export response utilities
export {
  extractFalErrorMessage,
  extractFirstImageUrl,
  extractImages,
  extractResultData,
  extractVideoUrl,
} from "./response";
