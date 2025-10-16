"use client";

/**
 * Canvas header component with authentication and navigation.
 *
 * Displays application title, authentication state, and auto-save indicator.
 */

import { SignInButton } from "@/components/auth/sign-in-button";
import { UserMenu } from "@/components/auth/user-menu";
import {
  AutoSaveIndicator,
  type SaveStatus,
} from "@/components/canvas/auto-save-indicator";
import { OfflineIndicator } from "@/components/canvas/offline-indicator";

import { useAuth } from "@/hooks/useAuth";
import {
  autoSaveErrorAtom,
  isAutoSavingAtom,
  lastSavedAtAtom,
} from "@/store/project-atoms";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";

/**
 * Props for the CanvasHeader component.
 */
interface CanvasHeaderProps {
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Canvas header component.
 *
 * Top navigation bar that displays:
 * - Application branding
 * - Authentication state (SignInButton or UserMenu)

 * - Auto-save status indicator (for authenticated users)
 * - Offline indicator (when disconnected)
 *
 * @remarks
 * - Fixed position at top of viewport
 * - Shows SignInButton when not authenticated
 * - Shows UserMenu when authenticated
 * - Auto-save indicator only visible when authenticated
 * - Responsive design with proper spacing
 *
 * @example
 * ```tsx
 * <CanvasHeader />
 * ```
 *
 * @param props - Component props
 * @returns Canvas header component
 */
export function CanvasHeader({ className }: CanvasHeaderProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Auto-save state
  const isAutoSaving = useAtomValue(isAutoSavingAtom);
  const lastSavedAt = useAtomValue(lastSavedAtAtom);
  const autoSaveError = useAtomValue(autoSaveErrorAtom);

  // Compute save status
  const saveStatus: SaveStatus = useMemo(() => {
    if (autoSaveError) return "error";
    if (isAutoSaving) return "saving";
    if (lastSavedAt) return "saved";
    return "idle";
  }, [isAutoSaving, lastSavedAt, autoSaveError]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 ${className || ""}`}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-foreground" />
        </div>

        <div className="flex items-center gap-3">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>

                  <UserMenu />
                </>
              ) : (
                <SignInButton size="sm" variant="primary" />
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
