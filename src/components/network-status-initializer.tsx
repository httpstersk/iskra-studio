/**
 * Network status initializer component.
 *
 * Sets up network status monitoring and syncing when the app loads.
 * Should be included once in the app's root providers.
 */

"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Network status initializer component.
 *
 * Initializes network monitoring and handles online/offline events
 * at the application level. This component doesn't render anything
 * but sets up necessary event listeners.
 *
 * @remarks
 * - Should be included once in the app's provider tree
 * - Monitors network status using navigator.onLine
 * - Updates global isOnlineAtom when status changes
 * - Logs status changes to console for debugging
 *
 * @example
 * ```tsx
 * // In app/core-providers.tsx or app/layout.tsx
 * export function CoreProviders({ children }) {
 *   return (
 *     <Provider>
 *       <NetworkStatusInitializer />
 *       {children}
 *     </Provider>
 *   );
 * }
 * ```
 *
 * @returns null (no UI rendered)
 */
export function NetworkStatusInitializer() {
  const { isOnline } = useNetworkStatus({
    showNotifications: false, // Don't show notifications at app level
    onOnline: () => {},
    onOffline: () => {},
  });

  // This component doesn't render anything
  return null;
}
