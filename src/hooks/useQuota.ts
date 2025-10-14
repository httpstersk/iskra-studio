"use client";

import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
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
  
  /** Function to manually refresh quota data */
  refetch: () => void;
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
 * - Automatically polls quota every 30 seconds while component is mounted
 * - Uses calculateStorageQuota utility to derive percentage and flags
 * - Handles loading and error states
 * 
 * @example
 * ```tsx
 * function StorageDisplay() {
 *   const { quota, isLoading, error, refetch } = useQuota();
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
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @returns Quota information and status
 */
export function useQuota(): UseQuotaReturn {
  const { userId, tier } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch quota data from Convex
  const quotaData = useQuery(
    api.users.getUserQuota,
    userId ? { userId } : "skip"
  );

  // Poll quota every 30 seconds
  useEffect(() => {
    if (!userId) return;

    const intervalId = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [userId]);

  // Calculate quota information
  const quota: StorageQuota | null = quotaData
    ? calculateStorageQuota(quotaData.storageUsedBytes, tier)
    : null;

  // Handle errors
  useEffect(() => {
    if (quotaData === undefined && userId) {
      setError("Failed to fetch quota data");
    } else {
      setError(null);
    }
  }, [quotaData, userId]);

  /**
   * Manually triggers a quota data refresh.
   * 
   * @remarks
   * Forces a re-fetch of quota data from Convex.
   * Useful after uploading or deleting assets.
   */
  const refetch = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return {
    error,
    isLoading: quotaData === undefined && userId !== null,
    quota,
    refetch,
  };
}
