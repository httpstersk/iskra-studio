/**
 * Client-side quota utility functions
 *
 * Helpers for quota calculations, formatting, and display logic.
 */

import type { GenerationType, SubscriptionTier } from "@/types/subscription";

export type { GenerationType, SubscriptionTier };

/**
 * Calculate days until billing cycle reset
 *
 * @param billingCycleEnd - Billing cycle end timestamp
 * @returns Number of days until reset
 */
export function calculateDaysUntilReset(billingCycleEnd: number): number {
  const now = Date.now();
  const diff = billingCycleEnd - now;

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate quota usage percentage
 *
 * @param used - Amount used
 * @param limit - Total limit
 * @returns Percentage (0-100)
 */
export function calculateQuotaPercentage(used: number, limit: number): number {
  if (limit === 0) {
    return 100;
  }
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if quota is exceeded
 *
 * @param used - Amount used
 * @param limit - Total limit
 * @returns True if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number): boolean {
  return used >= limit;
}

/**
 * Check if quota warning threshold is reached (80%)
 *
 * @param used - Amount used
 * @param limit - Total limit
 * @returns True if at or above 80% usage
 */
export function isQuotaWarning(used: number, limit: number): boolean {
  return calculateQuotaPercentage(used, limit) >= 80;
}

/**
 * Format quota display string
 *
 * @param used - Amount used
 * @param limit - Total limit
 * @param type - Type of quota ("image" or "video")
 * @returns Formatted string (e.g., "18/24 images")
 */
export function formatQuotaDisplay(
  used: number,
  limit: number,
  type: GenerationType
): string {
  const label = type === "image" ? "images" : "videos";
  return `${used}/${limit} ${label}`;
}

/**
 * Get quota status color based on usage
 *
 * @param percentage - Usage percentage (0-100)
 * @returns Color string for UI ("green", "yellow", "red")
 */
export function getQuotaStatusColor(percentage: number): string {
  if (percentage >= 100) {
    return "red";
  }
  if (percentage >= 80) {
    return "yellow";
  }
  return "green";
}

/**
 * Format billing cycle date range
 *
 * @param start - Billing cycle start timestamp
 * @param end - Billing cycle end timestamp
 * @returns Formatted date range string
 */
export function formatBillingCycle(start: number, end: number): string {
  const startDate = new Date(start).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endDate = new Date(end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startDate} - ${endDate}`;
}

/**
 * Get time until quota reset in human-readable format
 *
 * @param billingCycleEnd - Billing cycle end timestamp
 * @returns Human-readable time string
 */
export function getTimeUntilReset(billingCycleEnd: number): string {
  const days = calculateDaysUntilReset(billingCycleEnd);

  if (days === 0) {
    return "Resets today";
  }
  if (days === 1) {
    return "Resets tomorrow";
  }
  return `Resets in ${days} days`;
}

/**
 * Check if user should see upgrade prompt
 *
 * @param tier - Current subscription tier
 * @param imagePercentage - Image quota percentage
 * @param videoPercentage - Video quota percentage
 * @returns True if upgrade prompt should be shown
 */
export function shouldShowUpgradePrompt(
  tier: SubscriptionTier,
  imagePercentage: number,
  videoPercentage: number
): boolean {
  if (tier !== "free") {
    return false;
  }

  // Show upgrade prompt if either quota is at 80% or above
  return imagePercentage >= 80 || videoPercentage >= 80;
}
