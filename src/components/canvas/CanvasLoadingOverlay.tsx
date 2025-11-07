/**
 * Canvas loading overlay component.
 *
 * Full-screen overlay that displays when switching between projects.
 * Shows a centered loading spinner with smooth fade-in/out transitions.
 */

"use client";

import { Loader } from "@/components/ai-elements/loader";
import { cn } from "@/lib/utils";

/**
 * Props for CanvasLoadingOverlay component.
 */
interface CanvasLoadingOverlayProps {
  /** Whether the loading overlay is visible */
  isLoading: boolean;
}

/**
 * Canvas loading overlay component.
 *
 * Full-screen overlay with backdrop blur and centered loading spinner.
 * Used when switching between projects to provide visual feedback.
 *
 * @remarks
 * - Covers the entire canvas area
 * - Semi-transparent background with backdrop blur
 * - Smooth fade-in/out transitions
 * - Centered loading spinner
 * - Prevents interaction with canvas during loading
 *
 * @example
 * ```tsx
 * <CanvasLoadingOverlay isLoading={projects.isLoading} />
 * ```
 */
export function CanvasLoadingOverlay({ isLoading }: CanvasLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        "bg-background/60 backdrop-blur-md",
        "animate-in fade-in duration-200",
      )}
      role="status"
      aria-label="Loading project"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader size={32} className="text-primary" />
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    </div>
  );
}
