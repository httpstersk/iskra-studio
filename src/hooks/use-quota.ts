/**
 * Custom hook for quota tracking and enforcement.
 *
 * Provides functions to check quota status and remaining usage.
 * Integrates with Convex backend for real-time quota updates.
 */

"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { QuotaStatus, GenerationType } from "@/types/subscription";
import { getQuotaLimits } from "@/types/subscription";
import {
  calculateQuotaPercentage,
  calculateDaysUntilReset,
} from "@/lib/quota-utils";
import { useAuth } from "./useAuth";

/**
 * Return type for the useQuota hook.
 */
interface UseQuotaReturn {
  /** Full quota status information */
  quotaStatus: QuotaStatus | null;

  /** Whether quota data is loading */
  isLoading: boolean;

  /** Images used in current period */
  imagesUsed: number;

  /** Total images allowed in current period */
  imagesLimit: number;

  /** Images remaining in current period */
  imagesRemaining: number;

  /** Percentage of image quota used */
  imagesPercentage: number;

  /** Videos used in current period */
  videosUsed: number;

  /** Total videos allowed in current period */
  videosLimit: number;

  /** Videos remaining in current period */
  videosRemaining: number;

  /** Percentage of video quota used */
  videosPercentage: number;

  /** Days until quota resets */
  daysUntilReset: number;

  /** Date when quota will reset */
  resetDate: Date | null;

  /** Whether image quota is exceeded */
  imageQuotaExceeded: boolean;

  /** Whether video quota is exceeded */
  videoQuotaExceeded: boolean;

  /** Whether quota is in warning state (>80% used) */
  isWarning: boolean;

  /** Check if user can generate a specific type */
  canGenerate: (type: GenerationType) => boolean;
}

/**
 * Custom hook for quota management.
 *
 * Provides real-time quota status with automatic updates via Convex
 * reactive queries. Calculates remaining quota and warning states.
 *
 * @remarks
 * - All operations require user authentication
 * - Quota automatically resets at billing cycle end
 * - Real-time updates ensure quota is always current
 *
 * @example
 * ```tsx
 * function QuotaIndicator() {
 *   const {
 *     imagesRemaining,
 *     videosRemaining,
 *     canGenerate,
 *     isWarning,
 *   } = useQuota();
 *
 *   return (
 *     <div className={isWarning ? "text-warning" : ""}>
 *       <p>Images: {imagesRemaining} remaining</p>
 *       <p>Videos: {videosRemaining} remaining</p>
 *       {!canGenerate("image") && (
 *         <p>Image quota exceeded!</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useQuota(): UseQuotaReturn {
  const { isAuthenticated } = useAuth();

  // Fetch subscription data which includes quota information
  const subscriptionData = useQuery(
    api.subscriptions.getSubscriptionStatus,
    isAuthenticated ? {} : "skip",
  );

  // Memoize quota status to avoid unnecessary recalculations
  const quotaStatus = useMemo((): QuotaStatus | null => {
    if (!subscriptionData) return null;

    const tier = subscriptionData.tier;
    // Use limits from backend if available, otherwise fallback to client-side constants
    const limits = subscriptionData.quotaLimits ?? getQuotaLimits(tier);

    const resetDate = subscriptionData.billingCycleEnd
      ? new Date(subscriptionData.billingCycleEnd)
      : null;

    return {
      imagesUsed: subscriptionData.imagesUsedInPeriod ?? 0,
      imagesLimit: limits.images,
      videosUsed: subscriptionData.videosUsedInPeriod ?? 0,
      videosLimit: limits.videos,
      resetDate,
      daysUntilReset: subscriptionData.billingCycleEnd
        ? calculateDaysUntilReset(subscriptionData.billingCycleEnd)
        : 30,
    };
  }, [subscriptionData]);

  // Calculate derived values
  const imagesUsed = quotaStatus?.imagesUsed ?? 0;
  const imagesLimit = quotaStatus?.imagesLimit ?? 24; // Default to free tier
  const imagesRemaining = Math.max(0, imagesLimit - imagesUsed);
  const imagesPercentage = calculateQuotaPercentage(imagesUsed, imagesLimit);

  const videosUsed = quotaStatus?.videosUsed ?? 0;
  const videosLimit = quotaStatus?.videosLimit ?? 4; // Default to free tier
  const videosRemaining = Math.max(0, videosLimit - videosUsed);
  const videosPercentage = calculateQuotaPercentage(videosUsed, videosLimit);

  const imageQuotaExceeded = imagesUsed >= imagesLimit;
  const videoQuotaExceeded = videosUsed >= videosLimit;

  const isWarning = imagesPercentage >= 80 || videosPercentage >= 80;

  const resetDate = quotaStatus?.resetDate ?? null;
  const daysUntilReset = quotaStatus?.daysUntilReset ?? 30;

  /**
   * Check if user can generate a specific type.
   */
  const canGenerate = (type: GenerationType): boolean => {
    if (type === "image") {
      return !imageQuotaExceeded;
    }
    return !videoQuotaExceeded;
  };

  return {
    canGenerate,
    daysUntilReset,
    imageQuotaExceeded,
    imagesLimit,
    imagesPercentage,
    imagesRemaining,
    imagesUsed,
    isLoading: subscriptionData === undefined && isAuthenticated,
    isWarning,
    quotaStatus,
    resetDate,
    videoQuotaExceeded,
    videosLimit,
    videosPercentage,
    videosRemaining,
    videosUsed,
  };
}
