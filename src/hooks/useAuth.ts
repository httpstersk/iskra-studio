"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import {
  isAuthenticatedAtom,
  userAtom,
  userTierAtom,
} from "@/store/auth-atoms";
import type { User, UserTier } from "@/types/auth";
import { api } from "../../convex/_generated/api";

/**
 * Return type for the useAuth hook.
 */
interface UseAuthReturn {
  /** Convex user record with tier and storage information */
  convexUser: User | null;
  
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  
  /** Whether authentication data is still loading */
  isLoading: boolean;
  
  /** Function to initiate sign-in flow */
  signIn: () => void;
  
  /** Function to sign out the current user */
  signOut: () => Promise<void>;
  
  /** User's subscription tier */
  tier: UserTier;
  
  /** Clerk user ID (if authenticated) */
  userId: string | null;
}

/**
 * Custom hook for authentication with Clerk and Convex integration.
 * 
 * Combines Clerk's authentication with Convex user data to provide
 * a unified authentication interface. Automatically syncs user data
 * between Clerk and Convex on authentication state changes.
 * 
 * @remarks
 * - Returns null for user fields when not authenticated
 * - Automatically creates Convex user record on first sign-in (via backend)
 * - Updates Jotai atoms with current authentication state
 * - Provides sign-in and sign-out functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAuthenticated, tier, signIn, signOut } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <button onClick={signIn}>Sign In</button>;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Tier: {tier}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @returns Authentication state and functions
 */
export function useAuth(): UseAuthReturn {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { openSignIn, signOut: clerkSignOut } = useClerk();
  const [userInfo, setUserInfo] = useAtom(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const tier = useAtomValue(userTierAtom);

  // Convex mutation to get or create user
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  /**
   * Syncs Clerk user data to Jotai atoms and ensures Convex user exists.
   * 
   * @remarks
   * - Updates userAtom when Clerk authentication state changes
   * - Calls getOrCreateUser to ensure user exists in Convex database
   * - Updates convexUser data once fetched from Convex
   */
  useEffect(() => {
    if (isClerkLoaded && clerkUser) {
      const syncUser = async () => {
        try {
          // Get or create user in Convex
          const convexUser = await getOrCreateUser({
            userId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          });

          // Update atom with Convex user data
          setUserInfo({
            clerkUser: clerkUser as any,
            convexUser: convexUser
              ? {
                  userId: convexUser.userId,
                  email: convexUser.email,
                  tier: convexUser.tier,
                  storageUsedBytes: convexUser.storageUsedBytes,
                  createdAt: convexUser.createdAt,
                  updatedAt: convexUser.updatedAt,
                }
              : null,
          });
        } catch (error) {
          console.error("Failed to sync user with Convex:", error);
          // Fallback to mock data if Convex sync fails
          setUserInfo({
            clerkUser: clerkUser as any,
            convexUser: {
              createdAt: Date.now(),
              email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
              storageUsedBytes: 0,
              tier: "free",
              updatedAt: Date.now(),
              userId: clerkUser.id,
            },
          });
        }
      };

      syncUser();
    } else if (isClerkLoaded && !clerkUser) {
      // User is not authenticated, clear user info
      setUserInfo({
        clerkUser: null,
        convexUser: null,
      });
    }
  }, [clerkUser, isClerkLoaded, getOrCreateUser, setUserInfo]);

  /**
   * Initiates the Clerk sign-in flow.
   * 
   * @remarks
   * Opens the Clerk sign-in modal or redirects to sign-in page.
   */
  const signIn = () => {
    openSignIn();
  };

  /**
   * Signs out the current user.
   * 
   * @remarks
   * - Clears Clerk session
   * - Clears Jotai authentication atoms
   * - Redirects to home page
   */
  const signOut = async () => {
    await clerkSignOut();
    setUserInfo({
      clerkUser: null,
      convexUser: null,
    });
  };

  return {
    convexUser: userInfo.convexUser,
    isAuthenticated,
    isLoading: !isClerkLoaded,
    signIn,
    signOut,
    tier,
    userId: clerkUser?.id ?? null,
  };
}
