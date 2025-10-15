/**
 * Auto-save indicator component for canvas.
 * 
 * Shows the current save status with visual feedback:
 * - "Saving..." with spinner when save is in progress
 * - "Saved at [time]" with check icon when save succeeds
 * - "Failed to save" with error icon and retry button when save fails
 */

"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

/**
 * Save status type.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Props for the AutoSaveIndicator component.
 */
interface AutoSaveIndicatorProps {
  /** Current save status */
  status: SaveStatus;
  /** Timestamp of last successful save (optional) */
  lastSavedAt?: number | null;
  /** Error message (shown when status is "error") */
  error?: string;
  /** Callback to retry save operation */
  onRetry?: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Position of the indicator */
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
}

/**
 * Auto-save indicator component.
 * 
 * Provides visual feedback for canvas auto-save operations with
 * different states (saving, saved, error). Automatically hides
 * after 3 seconds when save succeeds.
 * 
 * @remarks
 * - Shows spinner animation during save
 * - Shows check mark with timestamp after successful save
 * - Shows error icon with retry button on failure
 * - Auto-hides success state after 3 seconds
 * - Uses relative time format ("2 minutes ago")
 * 
 * @example
 * ```tsx
 * function MyCanvas() {
 *   const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
 *   const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
 *   
 *   return (
 *     <AutoSaveIndicator
 *       status={saveStatus}
 *       lastSavedAt={lastSavedAt}
 *       onRetry={() => saveCanvas()}
 *     />
 *   );
 * }
 * ```
 * 
 * @param props - Component props
 * @returns Auto-save indicator or null if idle
 */
export function AutoSaveIndicator({
  status,
  lastSavedAt,
  error,
  onRetry,
  className,
  position = "bottom-right",
}: AutoSaveIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<number | null>(null);

  // Show indicator when status changes from idle
  useEffect(() => {
    if (status !== "idle") {
      setIsVisible(true);

      // Clear existing timeout
      if (hideTimeout !== null) {
        cancelIdleCallback(hideTimeout);
        setHideTimeout(null);
      }
    }

    // Auto-hide after 3 seconds when saved
    // Use requestIdleCallback for non-critical UI updates to avoid blocking main thread
    if (status === "saved") {
      const timeout = requestIdleCallback(() => {
        setIsVisible(false);
      }, { timeout: 3000 });
      setHideTimeout(timeout);
    }

    return () => {
      if (hideTimeout !== null) {
        cancelIdleCallback(hideTimeout);
      }
    };
  }, [status]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Position classes
  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  };

  // Format last saved time
  const formattedTime = lastSavedAt
    ? formatDistanceToNow(lastSavedAt, { addSuffix: true })
    : null;

  return (
    <div
      className={`fixed z-40 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm shadow-md ${positionClasses[position]} ${className || ""}`}
      role="status"
      aria-live="polite"
    >
      {/* Saving state */}
      {status === "saving" && (
        <>
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}

      {/* Saved state */}
      {status === "saved" && (
        <>
          <Check
            className="h-4 w-4 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {formattedTime ? `Saved ${formattedTime}` : "Saved"}
          </span>
        </>
      )}

      {/* Error state */}
      {status === "error" && (
        <>
          <X
            className="h-4 w-4 text-destructive"
            aria-hidden="true"
          />
          <span className="text-destructive">
            {error || "Failed to save"}
          </span>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-6 px-2 text-xs"
              aria-label="Retry save"
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Hook for managing auto-save indicator state.
 * 
 * Provides state and helpers for the AutoSaveIndicator component.
 * 
 * @returns State and functions for managing save indicator
 * 
 * @example
 * ```tsx
 * function MyCanvas() {
 *   const saveIndicator = useAutoSaveIndicator();
 *   
 *   const handleSave = async () => {
 *     saveIndicator.setSaving();
 *     try {
 *       await saveCanvas();
 *       saveIndicator.setSaved();
 *     } catch (error) {
 *       saveIndicator.setError(error.message);
 *     }
 *   };
 *   
 *   return (
 *     <AutoSaveIndicator
 *       status={saveIndicator.status}
 *       lastSavedAt={saveIndicator.lastSavedAt}
 *       error={saveIndicator.error}
 *       onRetry={handleSave}
 *     />
 *   );
 * }
 * ```
 */
export function useAutoSaveIndicator() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const setSaving = () => {
    setStatus("saving");
    setError(undefined);
  };

  const setSaved = () => {
    setStatus("saved");
    setLastSavedAt(Date.now());
    setError(undefined);
  };

  const setErrorState = (errorMessage?: string) => {
    setStatus("error");
    setError(errorMessage);
  };

  const reset = () => {
    setStatus("idle");
    setError(undefined);
  };

  return {
    error,
    lastSavedAt,
    reset,
    setError: setErrorState,
    setSaved,
    setSaving,
    status,
  };
}
