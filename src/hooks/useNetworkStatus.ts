/**
 * Custom hook for monitoring network status.
 *
 * Provides real-time online/offline status and handles sync operations
 * when network connectivity changes.
 *
 * Now uses useSyncExternalStore for optimal performance.
 */

"use client";

import { createLogger } from "@/lib/logger";
import { showError, showInfo } from "@/lib/toast";
import { isOnlineAtom } from "@/store/ui-atoms";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

const log = createLogger("NetworkStatus");

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
  const { showNotifications = false, onOnline, onOffline } = options;

  // Use external store for online status (single shared subscription)
  const isOnlineExternal = useOnlineStatus();

  // Sync with Jotai atom for backward compatibility
  const [, setIsOnline] = useAtom(isOnlineAtom);

  // Track previous status to detect changes
  const prevOnlineRef = useRef(isOnlineExternal);

  // Sync external store status to Jotai atom and trigger callbacks
  useEffect(() => {
    // Update atom
    setIsOnline(isOnlineExternal);

    // Detect status change
    const hasChanged = prevOnlineRef.current !== isOnlineExternal;

    if (hasChanged) {
      if (isOnlineExternal) {
        // Went online
        log.success("Network connection restored");

        if (showNotifications) {
          showInfo(
            "Back online",
            "Network connection restored. Syncing changes...",
          );
        }

        onOnline?.();
      } else {
        // Went offline
        log.warn("Network connection lost");

        if (showNotifications) {
          showError("You're offline", "Changes will sync when reconnected.");
        }

        onOffline?.();
      }

      prevOnlineRef.current = isOnlineExternal;
    }
  }, [isOnlineExternal, setIsOnline, showNotifications, onOnline, onOffline]);

  return {
    isOnline: isOnlineExternal,
  };
}
