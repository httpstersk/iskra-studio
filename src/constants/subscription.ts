/**
 * Subscription and Quota Constants
 *
 * Defines the quota limits for Free and Pro subscription tiers,
 * as well as other subscription-related configuration.
 */

/**
 * Subscription tier quotas
 */
export const QUOTA_LIMITS = {
  free: {
    images: 24,
    videos: 4,
  },
  pro: {
    images: 480,
    videos: 96,
  },
} as const;

/**
 * Subscription tier names
 */
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  PRO: "pro",
} as const;

/**
 * Billing intervals
 */
export const BILLING_INTERVALS = {
  MONTHLY: "month",
  ANNUAL: "year",
} as const;

/**
 * Subscription pricing (in USD cents)
 * TODO: Update these values to match your Polar product pricing
 */
export const PRICING = {
  pro: {
    monthly: 1900, // $19.00/month
    annual: 17100, // $171.00/year (10% discount)
  },
} as const;

/**
 * Get quota limits for a specific tier
 */
export function getQuotaLimits(tier: "free" | "pro") {
  return QUOTA_LIMITS[tier];
}

/**
 * Calculate quota percentage used
 */
export function calculateQuotaPercentage(used: number, limit: number): number {
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  return used >= limit;
}

/**
 * Check if quota warning threshold is reached (80%)
 */
export function isQuotaWarning(used: number, limit: number): boolean {
  return calculateQuotaPercentage(used, limit) >= 80;
}

/**
 * Quota notification thresholds
 */
export const QUOTA_THRESHOLDS = {
  WARNING: 80, // Percentage threshold for warning notification
  CRITICAL: 100, // Percentage threshold for critical notification
} as const;
