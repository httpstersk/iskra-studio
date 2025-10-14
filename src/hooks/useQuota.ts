"use client";

import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./useAuth";
import { calculateStorageQuota } from "@/utils/quota-utils";
import type { StorageQuota } from "@/types/auth";

/**
 * Return type for the useQuota hook.
 */
interface UseQuotaReturn {
  /** Storage quota information including usage and limits */
  quota: StorageQuota | null;
  
  /** Whether quota data is still loading */
  isLoading: boolean;
  
  /** Error message if quota fetch failed */
  error: string | null;
}

/**
 * Custom hook for tracking user storage quota.
 * 
 * Fetches the user's storage quota from Convex and provides
 * calculated quota information including usage percentage,
 * warnings, and limits.
 * 
 * @remarks
 * - Returns null for quota when user is not authenticated
 * - Uses Convex's reactive queries for automatic real-time updates
 * - No polling needed - updates automatically when data changes
 * - Uses calculateStorageQuota utility to derive percentage and flags
 * - Handles loading and error states
 * 
 * @example
 * ```tsx
 * function StorageDisplay() {
 *   const { quota, isLoading, error } = useQuota();
 *   
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (!quota) return null;
 *   
 *   return (
 *     <div>
 *       <p>{quota.percentage}% used</p>
 *       {quota.isApproachingLimit && <Warning />}
 *       {quota.isExceeded && <Error />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @returns Quota information and status
 */
export function useQuota(): UseQuotaReturn {
  const { isAuthenticated, tier } = useAuth();

  // Fetch quota data from Convex - reactive query updates automatically
  const quotaData = useQuery(
    api.users.getUserQuota,
    isAuthenticated ? {} : "skip"
  );

  // Calculate quota information with memoization
  const quota: StorageQuota | null = useMemo(() => {
    if (!quotaData) return null;
    return calculateStorageQuota(quotaData.storageUsedBytes, tier);
  }, [quotaData, tier]);

  // Determine error state
  const error = quotaData === undefined && isAuthenticated
    ? "Failed to fetch quota data"
    : null;

  return {
    error,
    isLoading: quotaData === undefined && isAuthenticated,
    quota,
  };
}
