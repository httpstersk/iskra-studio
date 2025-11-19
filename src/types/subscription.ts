/**
 * Subscription tier types
 */
export type SubscriptionTier = "free" | "paid" | "pro";

/**
 * Subscription status from Polar
 */
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "unpaid";

/**
 * Billing interval for subscriptions
 */
export type BillingInterval = "month" | "year";

/**
 * Generation type for quota tracking
 */
export type GenerationType = "image" | "video";

/**
 * Quota status information
 */
export interface QuotaStatus {
  daysUntilReset: number;
  imagesLimit: number;
  imagesUsed: number;
  resetDate: Date | null;
  videosLimit: number;
  videosUsed: number;
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
  billingCycleEnd: Date | null;
  billingCycleStart: Date | null;
  billingInterval: BillingInterval | null;
  cancelAtPeriodEnd: boolean;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  status: SubscriptionStatus | null;
  tier: SubscriptionTier;
}

/**
 * Quota constants
 */
export const QUOTA_LIMITS = {
  FREE_IMAGE_QUOTA: 24,
  FREE_VIDEO_QUOTA: 4,
  PRO_IMAGE_QUOTA: 480,
  PRO_VIDEO_QUOTA: 96,
} as const;

/**
 * Get quota limits based on subscription tier
 */
export function getQuotaLimits(tier: SubscriptionTier): {
  images: number;
  videos: number;
} {
  if (tier === "pro") {
    return {
      images: QUOTA_LIMITS.PRO_IMAGE_QUOTA,
      videos: QUOTA_LIMITS.PRO_VIDEO_QUOTA,
    };
  }
  return {
    images: QUOTA_LIMITS.FREE_IMAGE_QUOTA,
    videos: QUOTA_LIMITS.FREE_VIDEO_QUOTA,
  };
}

/**
 * Calculate quota percentage used
 */
export function calculateQuotaPercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/**
 * Calculate days until quota reset
 */
export function calculateDaysUntilReset(resetDate: Date | null): number {
  if (!resetDate) return 30; // Default to 30 days for free tier
  const now = new Date();
  const diffTime = resetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
