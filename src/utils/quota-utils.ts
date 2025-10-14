/**
 * Storage quota utility functions.
 * 
 * Provides utilities for calculating storage usage, checking quota limits,
 * and formatting storage sizes for display.
 */

import type { UserTier } from "@/types/auth";

/**
 * Storage quota limits in bytes for each tier.
 */
const QUOTA_LIMITS: Record<UserTier, number> = {
  free: 500 * 1024 * 1024, // 500 MB
  paid: 10 * 1024 * 1024 * 1024, // 10 GB
};

/**
 * Gets the storage quota limit for a given user tier.
 * 
 * @param tier - User tier ("free" or "paid")
 * @returns Storage limit in bytes
 * 
 * @example
 * ```ts
 * const limit = getQuotaForTier("free");
 * console.log(limit); // 524288000 (500 MB in bytes)
 * ```
 */
export function getQuotaForTier(tier: UserTier): number {
  return QUOTA_LIMITS[tier];
}

/**
 * Checks if an upload would exceed the user's storage quota.
 * 
 * @param currentUsageBytes - Current storage usage in bytes
 * @param uploadSizeBytes - Size of the file to upload in bytes
 * @param tier - User tier
 * @returns True if upload would exceed quota, false otherwise
 * 
 * @example
 * ```ts
 * const wouldExceed = checkQuotaLimit(450_000_000, 100_000_000, "free");
 * console.log(wouldExceed); // true (450 MB + 100 MB > 500 MB)
 * ```
 */
export function checkQuotaLimit(
  currentUsageBytes: number,
  uploadSizeBytes: number,
  tier: UserTier,
): boolean {
  const limit = getQuotaForTier(tier);
  return currentUsageBytes + uploadSizeBytes > limit;
}

/**
 * Calculates storage quota information including percentage used.
 * 
 * @param usedBytes - Current storage usage in bytes
 * @param tier - User tier
 * @returns Quota information object
 * 
 * @example
 * ```ts
 * const quota = calculateStorageQuota(450_000_000, "free");
 * console.log(quota);
 * // {
 * //   used: 450000000,
 * //   limit: 524288000,
 * //   percentage: 85.83,
 * //   isApproachingLimit: true,
 * //   isExceeded: false
 * // }
 * ```
 */
export function calculateStorageQuota(usedBytes: number, tier: UserTier) {
  const limit = getQuotaForTier(tier);
  const percentage = (usedBytes / limit) * 100;
  
  return {
    isApproachingLimit: percentage >= 80,
    isExceeded: percentage >= 100,
    limit,
    percentage: Math.min(100, Math.round(percentage * 100) / 100),
    used: usedBytes,
  };
}

/**
 * Formats bytes to human-readable storage size string.
 * 
 * Converts bytes to the most appropriate unit (B, KB, MB, GB)
 * with 2 decimal places for sizes >= 1 KB.
 * 
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "45.2 MB", "1.5 GB")
 * 
 * @example
 * ```ts
 * formatStorageSize(1024); // "1.00 KB"
 * formatStorageSize(1536000); // "1.47 MB"
 * formatStorageSize(2147483648); // "2.00 GB"
 * formatStorageSize(512); // "512 B"
 * ```
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  // Don't show decimals for bytes
  if (i === 0) {
    return `${size} ${units[i]}`;
  }
  
  return `${size.toFixed(2)} ${units[i]}`;
}

/**
 * Gets the color class for storage quota display based on usage percentage.
 * 
 * Returns appropriate color for progress bars and indicators:
 * - Green: < 60% (safe)
 * - Yellow: 60-90% (warning)
 * - Red: > 90% (critical)
 * 
 * @param percentage - Storage usage percentage (0-100)
 * @returns Tailwind color class
 * 
 * @example
 * ```ts
 * getQuotaColor(45); // "text-green-600"
 * getQuotaColor(75); // "text-yellow-600"
 * getQuotaColor(95); // "text-red-600"
 * ```
 */
export function getQuotaColor(percentage: number): string {
  if (percentage >= 90) return "text-red-600";
  if (percentage >= 60) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Gets the progress bar color class based on usage percentage.
 * 
 * @param percentage - Storage usage percentage (0-100)
 * @returns Tailwind background color class
 * 
 * @example
 * ```ts
 * getQuotaProgressColor(45); // "bg-green-600"
 * getQuotaProgressColor(75); // "bg-yellow-600"
 * getQuotaProgressColor(95); // "bg-red-600"
 * ```
 */
export function getQuotaProgressColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-600";
  if (percentage >= 60) return "bg-yellow-600";
  return "bg-green-600";
}
