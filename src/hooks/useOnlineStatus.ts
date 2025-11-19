/**
 * Online status hook using useSyncExternalStore
 * Provides efficient network status tracking with automatic cleanup
 * Single shared subscription regardless of component count
 */

import { useSyncExternalStore } from "react";

// Cache for current online status
// Updated on online/offline events and read by getSnapshot
let cachedOnlineStatus: boolean =
  typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Subscribe to online/offline events
 * This function is shared across all hook instances for optimal performance
 */
function subscribe(callback: () => void): () => void {
  const handleOnline = () => {
    cachedOnlineStatus = true;
    callback();
  };

  const handleOffline = () => {
    cachedOnlineStatus = false;
    callback();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Get current online status snapshot
 * Returns cached value to prevent infinite loops
 */
function getSnapshot(): boolean {
  return cachedOnlineStatus;
}

/**
 * Get server-side snapshot (for SSR compatibility)
 * Returns true (online) as default for server rendering
 */
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to track online/offline status using useSyncExternalStore
 *
 * Benefits over traditional useEffect + useState:
 * - Single online/offline listener shared across all components
 * - Prevents tearing in concurrent rendering
 * - Automatic subscription management
 * - SSR compatible
 *
 * @returns Current online status (true = online, false = offline)
 *
 * @example
 * ```tsx
 * const isOnline = useOnlineStatus();
 *
 * return (
 *   <div>
 *     Status: {isOnline ? "Online ✓" : "Offline ✗"}
 *   </div>
 * );
 * ```
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
