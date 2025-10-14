/**
 * Jotai atoms for authentication state management.
 * 
 * Manages Clerk user authentication, user tier, and storage quota information.
 * 
 * @remarks
 * - userAtom stores the current Clerk user object and Convex user data
 * - Derived atoms calculate tier and quota information
 * - All atoms are null when user is not authenticated
 */

import { atom } from "jotai";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import type { StorageQuota, User, UserTier } from "@/types/auth";

/**
 * Combined user information from Clerk and Convex.
 * 
 * @remarks
 * Merges Clerk authentication data with Convex user record.
 */
export interface UserInfo {
  /** Clerk user object with authentication details */
  clerkUser: ClerkUser | null;
  
  /** Convex user record with tier and storage information */
  convexUser: User | null;
}

/**
 * Primary user atom storing combined Clerk and Convex user data.
 * 
 * @remarks
 * - Initially null until user is authenticated
 * - Updated by useAuth hook when authentication state changes
 * - Contains both Clerk user object and Convex user record
 */
export const userAtom = atom<UserInfo>({
  clerkUser: null,
  convexUser: null,
});

/**
 * Derived atom for user authentication status.
 * 
 * @remarks
 * Returns true if user is authenticated (has Clerk user object).
 */
export const isAuthenticatedAtom = atom((get) => {
  const { clerkUser } = get(userAtom);
  return clerkUser !== null;
});

/**
 * Derived atom for user tier.
 * 
 * @remarks
 * - Returns user tier from Convex record
 * - Defaults to "free" if no Convex user record exists
 */
export const userTierAtom = atom<UserTier>((get) => {
  const { convexUser } = get(userAtom);
  return convexUser?.tier ?? "free";
});

/**
 * Atom for user's storage quota information.
 * 
 * @remarks
 * - Initialized as null until quota data is fetched
 * - Updated by useQuota hook
 * - Used to display storage indicators and enforce limits
 */
export const storageQuotaAtom = atom<StorageQuota | null>(null);
