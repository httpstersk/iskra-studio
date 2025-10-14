/**
 * Utility functions for storage quota calculations and formatting.
 * 
 * Provides functions to calculate storage usage, check quota limits,
 * and format storage sizes for display in the UI.
 */

import type { Asset } from "@/types/asset";
import type { UserTier } from "@/types/auth";

/**
 * Storage quota limits in bytes for each user tier.
 * 
 * @remarks
 * - Free tier: 500 MB
 * - Paid tier: 10 GB
 */
const QUOTA_LIMITS: Record<UserTier, number> = {
  free: 500 * 1024 * 1024, // 500 MB
  paid: 10 * 1024 * 1024 * 1024, // 10 GB
};

/**
 * Calculates total storage usage from a list of assets.
 * 
 * Sums the sizeBytes field of all provided assets to determine
 * the total storage consumed by a user.
 * 
 * @param assets - Array of user's assets
 * @returns Total storage used in bytes
 * 
 * @example
 * ```ts
 * const assets: Asset[] = [
 *   { sizeBytes: 1024000, ... },
 *   { sizeBytes: 2048000, ... },
 * ];
 * const total = calculateStorageUsage(assets); // 3072000 bytes
 * ```
 */
export function calculateStorageUsage(assets: Asset[]): number {
  return assets.reduce((total, asset) => total + asset.sizeBytes, 0);
}

/**
 * Checks if an upload would exceed the user's storage quota.
 * 
 * Compares the user's current storage usage plus the size of a new
 * upload against their tier's quota limit.
 * 
 * @param currentUsageBytes - Current storage used by user in bytes
 * @param uploadSizeBytes - Size of the file to be uploaded in bytes
 * @param tier - User's subscription tier
 * @returns True if upload would exceed quota, false otherwise
 * 
 * @example
 * ```ts
 * const currentUsage = 450 * 1024 * 1024; // 450 MB
 * const uploadSize = 100 * 1024 * 1024; // 100 MB
 * const wouldExceed = checkQuotaLimit(currentUsage, uploadSize, "free");
 * // Returns true (450 + 100 = 550 MB > 500 MB limit)
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
 * Formats bytes into a human-readable storage size string.
 * 
 * Converts raw bytes into appropriate units (B, KB, MB, GB)
 * with proper decimal precision.
 * 
 * @param bytes - Number of bytes to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "45.2 MB", "1.5 GB")
 * 
 * @example
 * ```ts
 * formatStorageSize(0); // "0 B"
 * formatStorageSize(1024); // "1.0 KB"
 * formatStorageSize(1536000); // "1.5 MB"
 * formatStorageSize(2147483648); // "2.0 GB"
 * formatStorageSize(1536000, 2); // "1.46 MB"
 * ```
 */
export function formatStorageSize(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Gets the storage quota limit in bytes for a given tier.
 * 
 * @param tier - User's subscription tier
 * @returns Quota limit in bytes
 * 
 * @example
 * ```ts
 * const freeLimit = getQuotaForTier("free"); // 524288000 (500 MB)
 * const paidLimit = getQuotaForTier("paid"); // 10737418240 (10 GB)
 * ```
 */
export function getQuotaForTier(tier: UserTier): number {
  return QUOTA_LIMITS[tier];
}

/**
 * Calculates the percentage of quota used.
 * 
 * @param usedBytes - Current storage used in bytes
 * @param tier - User's subscription tier
 * @returns Percentage of quota used (0-100+)
 * 
 * @example
 * ```ts
 * const used = 250 * 1024 * 1024; // 250 MB
 * const percentage = getQuotaPercentage(used, "free"); // 50.0
 * ```
 */
export function getQuotaPercentage(usedBytes: number, tier: UserTier): number {
  const limit = getQuotaForTier(tier);
  if (limit === 0) return 0;
  return (usedBytes / limit) * 100;
}

/**
 * Checks if user is approaching their storage limit.
 * 
 * Returns true when usage reaches 80% of quota.
 * 
 * @param usedBytes - Current storage used in bytes
 * @param tier - User's subscription tier
 * @returns True if at or above 80% of quota
 * 
 * @example
 * ```ts
 * const used = 400 * 1024 * 1024; // 400 MB
 * const approaching = isApproachingLimit(used, "free"); // true (80% of 500 MB)
 * ```
 */
export function isApproachingLimit(usedBytes: number, tier: UserTier): boolean {
  return getQuotaPercentage(usedBytes, tier) >= 80;
}

/**
 * Checks if user has exceeded their storage limit.
 * 
 * Returns true when usage reaches or exceeds 100% of quota.
 * 
 * @param usedBytes - Current storage used in bytes
 * @param tier - User's subscription tier
 * @returns True if at or above 100% of quota
 * 
 * @example
 * ```ts
 * const used = 550 * 1024 * 1024; // 550 MB
 * const exceeded = isQuotaExceeded(used, "free"); // true (110% of 500 MB)
 * ```
 */
export function isQuotaExceeded(usedBytes: number, tier: UserTier): boolean {
  return getQuotaPercentage(usedBytes, tier) >= 100;
}
