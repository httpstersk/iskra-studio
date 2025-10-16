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


