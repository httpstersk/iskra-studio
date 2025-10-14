/**
 * Custom hook for monitoring network status.
 * 
 * Provides real-time online/offline status and handles sync operations
 * when network connectivity changes.
 */

"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { isOnlineAtom } from "@/store/ui-atoms";
import { useToast } from "@/hooks/use-toast";

/**
 * Options for the useNetworkStatus hook.
 */
interface UseNetworkStatusOptions {
  /** Whether to show toast notifications on status changes */
  showNotifications?: boolean;
  /** Callback when network goes online */
  onOnline?: () => void;
  /** Callback when network goes offline */
  onOffline?: () => void;
}

/**
 * Custom hook for network status monitoring.
 * 
 * Monitors browser's online/offline status using the Network Information API
 * and updates global state. Optionally shows toast notifications and triggers
 * callbacks when status changes.
 * 
 * @remarks
 * - Uses `navigator.onLine` for current status
 * - Listens to `online` and `offline` events for real-time updates
 * - Updates Jotai atom for global state management
 * - Can trigger sync operations when coming back online
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { isOnline } = useNetworkStatus({
 *     showNotifications: true,
 *     onOnline: () => syncManager.flushQueue(),
 *   });
 *   
 *   return (
 *     <div>
 *       Status: {isOnline ? "Online" : "Offline"}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Object with isOnline status
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const {
    showNotifications = false,
    onOnline,
    onOffline,
  } = options;

  const [isOnline, setIsOnline] = useAtom(isOnlineAtom);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with current status
    setIsOnline(navigator.onLine);

    /**
     * Handles online event.
     */
    const handleOnline = () => {
      console.log("Network connection restored");
      setIsOnline(true);

      if (showNotifications) {
        toast({
          title: "Back online",
          description: "Network connection restored. Syncing changes...",
        });
      }

      onOnline?.();
    };

    /**
     * Handles offline event.
     */
    const handleOffline = () => {
      console.log("Network connection lost");
      setIsOnline(false);

      if (showNotifications) {
        toast({
          title: "You're offline",
          description: "Changes will sync when reconnected.",
          variant: "destructive",
        });
      }

      onOffline?.();
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setIsOnline, showNotifications, onOnline, onOffline, toast]);

  return {
    isOnline,
  };
}
