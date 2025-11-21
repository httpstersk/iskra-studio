"use client";

/**
 * Canvas header component with authentication and navigation.
 *
 * Displays application title, authentication state, and auto-save indicator.
 */

import { SignInButton } from "@/components/auth/sign-in-button";
import { UserMenu } from "@/components/auth/user-menu";
import { QuotaIndicator } from "@/components/subscription/quota-indicator";
import { Switch } from "@/components/ui/switch";
import { isFiboAnalysisEnabledAtom } from "@/store/ui-atoms";
import { useAuth } from "@/hooks/useAuth";
import { useAtom } from "jotai";

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
  const [isFiboAnalysisEnabled, setIsFiboAnalysisEnabled] = useAtom(
    isFiboAnalysisEnabledAtom,
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 ${className || ""}`}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center"></div>

        <div className="flex items-center gap-3">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 mr-4">
                    <Switch
                      id="fibo-mode"
                      checked={isFiboAnalysisEnabled}
                      onCheckedChange={setIsFiboAnalysisEnabled}
                    />
                    <label
                      htmlFor="fibo-mode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      FIBO Analysis
                    </label>
                  </div>
                  <QuotaIndicator />
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
