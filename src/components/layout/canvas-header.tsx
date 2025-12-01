"use client";

/**
 * Canvas header component with authentication and navigation.
 *
 * Displays application title, authentication state, and auto-save indicator.
 */

import { SignInButton } from "@/components/auth/sign-in-button";
import { UserMenu } from "@/components/auth/user-menu";
import { QuotaIndicator } from "@/components/subscription/quota-indicator";
import { CANVAS_HEADER_CLASSES } from "@/constants/canvas-header";
import { useAuth } from "@/hooks/useAuth";

import {
  AIProviderSelector,
  FiboAnalysisToggle,
  ImageModelSelector,
} from "./canvas-header-components";

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

  if (isLoading) {
    return (
      <header className={`${CANVAS_HEADER_CLASSES.HEADER} ${className || ""}`}>
        <div className={CANVAS_HEADER_CLASSES.HEADER_CONTENT} />
      </header>
    );
  }

  return (
    <header className={`${CANVAS_HEADER_CLASSES.HEADER} ${className || ""}`}>
      <div className={CANVAS_HEADER_CLASSES.HEADER_CONTENT}>
        <div className={CANVAS_HEADER_CLASSES.MAIN_CONTROLS}>
          {isAuthenticated ? (
            <>
              <AIProviderSelector />
              <ImageModelSelector />
              <FiboAnalysisToggle />
              <QuotaIndicator />
              <UserMenu />
            </>
          ) : (
            <SignInButton size="sm" variant="primary" />
          )}
        </div>
      </div>
    </header>
  );
}
