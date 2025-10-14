/**
 * Offline indicator component for canvas.
 * 
 * Displays a banner when network connection is lost, informing users
 * that their changes will sync when connectivity is restored.
 */

"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Props for the OfflineIndicator component.
 */
interface OfflineIndicatorProps {
  /** Optional CSS class name */
  className?: string;
  /** Whether to show queue count */
  showQueueCount?: boolean;
  /** Number of queued changes (optional) */
  queueCount?: number;
}

/**
 * Offline indicator component.
 * 
 * Shows a banner at the top of the canvas when the user is offline.
 * Automatically hides when network connection is restored.
 * 
 * @remarks
 * - Uses browser's `navigator.onLine` API for online/offline detection
 * - Listens to `online` and `offline` events for real-time updates
 * - Shows queued changes count when available
 * - Styled with warning colors (amber) for visibility
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <OfflineIndicator />
 * 
 * // With queue count
 * <OfflineIndicator 
 *   showQueueCount 
 *   queueCount={syncManager.getQueueLength()} 
 * />
 * ```
 * 
 * @param props - Component props
 * @returns Offline indicator banner or null if online
 */
export function OfflineIndicator({
  className,
  showQueueCount = false,
  queueCount = 0,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Handle online event
    const handleOnline = () => {
      console.log("Network connection restored");
      setIsOnline(true);
    };

    // Handle offline event
    const handleOffline = () => {
      console.log("Network connection lost");
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't render if online
  if (isOnline) {
    return null;
  }

  return (
    <Alert
      className={`fixed top-4 left-1/2 z-50 w-auto max-w-md -translate-x-1/2 border-amber-500 bg-amber-50 text-amber-900 shadow-lg dark:border-amber-600 dark:bg-amber-950 dark:text-amber-100 ${className || ""}`}
      role="alert"
      aria-live="polite"
    >
      <CloudOff
        className="h-4 w-4 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
      <AlertDescription className="ml-2">
        <span className="font-medium">You&apos;re offline.</span>{" "}
        Changes will sync when reconnected.
        {showQueueCount && queueCount > 0 && (
          <span className="ml-1 text-sm opacity-80">
            ({queueCount} {queueCount === 1 ? "change" : "changes"} queued)
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}
