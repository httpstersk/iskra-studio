/**
 * User tier types for subscription levels.
 * 
 * @remarks
 * - "free": Default tier with limited storage and rate limits
 * - "paid": Premium tier with increased storage and higher rate limits
 */
export type UserTier = "free" | "paid";

/**
 * User record from Convex database.
 * 
 * Represents an authenticated user in the system with their
 * subscription tier and storage usage information.
 * 
 * @remarks
 * - userId matches the Clerk user ID
 * - storageUsedBytes is automatically calculated from user's assets
 * - Timestamps are stored as numbers (milliseconds since epoch)
 */
export interface User {
  /** Timestamp when the user account was created (ms since epoch) */
  createdAt: number;
  
  /** User's email address from Clerk */
  email: string;
  
  /** Current storage usage in bytes */
  storageUsedBytes: number;
  
  /** Subscription tier determining storage quota and rate limits */
  tier: UserTier;
  
  /** Timestamp when the user record was last updated (ms since epoch) */
  updatedAt: number;
  
  /** Unique identifier matching Clerk user ID */
  userId: string;
}

/**
 * Storage quota information for a user.
 * 
 * Provides real-time information about a user's storage usage,
 * limits, and whether they are approaching or exceeding their quota.
 * 
 * @remarks
 * - Used for displaying storage indicators in the UI
 * - isApproachingLimit triggers warning indicators at 80%
 * - isExceeded prevents new uploads when quota is reached
 * 
 * @example
 * ```ts
 * const quota: StorageQuota = {
 *   limit: 524288000, // 500 MB
 *   percentage: 85,
 *   used: 445644800, // 425 MB
 *   isApproachingLimit: true,
 *   isExceeded: false,
 * };
 * ```
 */
export interface StorageQuota {
  /** Whether the user is approaching their storage limit (≥80%) */
  isApproachingLimit: boolean;
  
  /** Whether the user has exceeded their storage limit (≥100%) */
  isExceeded: boolean;
  
  /** Maximum storage allowed in bytes based on user tier */
  limit: number;
  
  /** Percentage of storage quota used (0-100+) */
  percentage: number;
  
  /** Current storage used in bytes */
  used: number;
}
