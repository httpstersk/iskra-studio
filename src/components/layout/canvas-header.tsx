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
import { useAuth } from "@/hooks/useAuth";
import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";
import {
  aiProviderAtom,
  imageModelAtom,
  isFiboAnalysisEnabledAtom,
} from "@/store/ui-atoms";
import { SegmentedControl } from "@radix-ui/themes";
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
    isFiboAnalysisEnabledAtom
  );
  const [aiProvider, setAiProvider] = useAtom(aiProviderAtom);
  const [imageModel, setImageModel] = useAtom(imageModelAtom);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 ${className || ""}`}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center"></div>

        <div className="flex items-center w-full gap-3">
          {!isLoading && (
            <>
              {isAuthenticated ? (
                <>
                  <SegmentedControl.Root
                    className="ml-24"
                    size="1"
                    value={aiProvider}
                    onValueChange={(value) => {
                      if (value === "replicate") return;
                      setAiProvider(value as "fal" | "replicate");
                    }}
                  >
                    <SegmentedControl.Item value="fal">
                      <div className="flex flex-row gap-2 justify-center items-center">
                        <svg
                          fill="#FF0000"
                          height="12"
                          viewBox="0 0 24 24"
                          width="12"
                        >
                          <path d="M15.4767 0C15.8923 0 16.2256 0.338042 16.2655 0.751966C16.6199 4.44335 19.558 7.38124 23.2498 7.73568C23.6637 7.77553 24.0017 8.10861 24.0017 8.52445V15.4756C24.0017 15.8914 23.6637 16.2245 23.2498 16.2643C19.558 16.6188 16.6199 19.5567 16.2655 23.2482C16.2256 23.662 15.8923 24 15.4767 24H8.52511C8.10932 24 7.77608 23.662 7.73633 23.2482C7.38178 19.5567 4.44377 16.6188 0.751985 16.2643C0.338099 16.2245 0 15.8914 0 15.4756V8.52445C0 8.10861 0.338099 7.77553 0.751985 7.73568C4.44377 7.38124 7.38178 4.44335 7.73633 0.751966C7.77608 0.338042 8.10932 0 8.52511 0H15.4767ZM4.81912 11.9798C4.81912 15.973 8.05283 19.21 12.0418 19.21C16.031 19.21 19.2646 15.973 19.2646 11.9798C19.2646 7.9864 16.031 4.74936 12.0418 4.74936C8.05283 4.74936 4.81912 7.9864 4.81912 11.9798Z" />
                        </svg>
                        <span>Fal</span>
                      </div>
                    </SegmentedControl.Item>
                    <SegmentedControl.Item
                      aria-disabled
                      className="cursor-not-allowed"
                      value="replicate"
                    >
                      <div className="flex flex-row gap-2 justify-center items-center">
                        <svg
                          fill="#666"
                          height="12"
                          viewBox="0 0 24 24"
                          width="12"
                        >
                          <path d="M24 10.2624V12.9744H14.4816V24H11.448V10.2624H24Z" />
                          <path d="M24 5.1312V7.848H8.7552V24H5.7216V5.1312H24Z" />
                          <path d="M24 0V2.7168H3.0336V24H0V0H24Z" />
                        </svg>

                        <span>Replicate</span>
                      </div>
                    </SegmentedControl.Item>
                  </SegmentedControl.Root>

                  <SegmentedControl.Root
                    className="mr-auto"
                    size="1"
                    value={imageModel}
                    onValueChange={(value) =>
                      setImageModel(value as ImageModelId)
                    }
                  >
                    <SegmentedControl.Item value={IMAGE_MODELS.SEEDREAM}>
                      🌱 Seedream
                    </SegmentedControl.Item>
                    <SegmentedControl.Item value={IMAGE_MODELS.NANO_BANANA}>
                      🍌 Nano Banana
                    </SegmentedControl.Item>
                  </SegmentedControl.Root>

                  <div className="flex items-center gap-2 mr-4">
                    <Switch
                      id="fibo-mode"
                      checked={isFiboAnalysisEnabled}
                      onCheckedChange={setIsFiboAnalysisEnabled}
                    />
                    <label
                      htmlFor="fibo-mode"
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
