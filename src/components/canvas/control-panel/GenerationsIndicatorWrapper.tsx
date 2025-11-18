/**
 * Generations Indicator Wrapper
 *
 * Wraps the GenerationsIndicator component with status resolution logic.
 * Displays real-time feedback on image/video generation progress with animated transitions.
 *
 * Status priority:
 * - Uploading: Image is being uploaded to storage
 * - Analyzing: AI is analyzing the source image
 * - Creating storyline: Generating narrative concepts
 * - Generating: Creating final output
 * - Success: Generation completed
 */

"use client";

import { GenerationsIndicator } from "@/components/generations-indicator";
import { cn } from "@/lib/utils";
import type { ActiveGeneration, ActiveVideoGeneration } from "@/types/canvas";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import {
  resolveGenerationStatusMessage,
  resolveSuccessMessage,
} from "./GenerationStatusResolver";

/**
 * Animation configuration for indicator transitions
 */
const ANIMATION_CONFIG = {
  DURATION: 0.2,
  EASING: "easeInOut",
  EXIT_SCALE: 0.9,
  EXIT_Y: -10,
  INITIAL_SCALE: 0.9,
  INITIAL_Y: -10,
} as const;

/**
 * Props for the GenerationsIndicatorWrapper component
 */
interface GenerationsIndicatorWrapperProps {
  /** Map of active image generation jobs */
  activeGenerations?: Map<string, ActiveGeneration>;
  /** Total count of active image generations */
  activeGenerationsSize: number;
  /** Map of active video generation jobs */
  activeVideoGenerations?: Map<string, ActiveVideoGeneration>;
  /** Total count of active video generations */
  activeVideoGenerationsSize: number;
  /** Whether any generation is currently in progress */
  isGenerating: boolean;
  /** Whether to show success state */
  showSuccess: boolean;
  /** Optional custom status message override */
  statusMessage?: string;
  /** Optional custom success message override */
  successMessage?: string;
}

/**
 * Wrapper component that displays generation status with contextual messages.
 * Automatically hides when no generations are active.
 *
 * @param props - Component props
 * @returns Animated status indicator or null if no generations active
 */
export function GenerationsIndicatorWrapper({
  activeGenerations,
  activeGenerationsSize,
  activeVideoGenerations,
  activeVideoGenerationsSize,
  isGenerating,
  showSuccess,
  statusMessage,
  successMessage,
}: GenerationsIndicatorWrapperProps) {
  // Determine if indicator should be visible
  const shouldShow =
    activeGenerationsSize > 0 ||
    activeVideoGenerationsSize > 0 ||
    isGenerating ||
    showSuccess;

  // Derive output type from active generations
  const isVideoGeneration = activeVideoGenerationsSize > 0;
  const outputType = isVideoGeneration ? "video" : "image";

  // Resolve status message based on current generation state
  const derivedStatusMessage = useMemo(
    () =>
      resolveGenerationStatusMessage({
        activeGenerations,
        activeGenerationsSize,
        activeVideoGenerations,
        activeVideoGenerationsSize,
        isGenerating,
        statusMessage,
      }),
    [
      activeGenerations,
      activeGenerationsSize,
      activeVideoGenerations,
      activeVideoGenerationsSize,
      isGenerating,
      statusMessage,
    ],
  );

  const resolvedSuccessMessage = resolveSuccessMessage(successMessage);

  if (!shouldShow) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "pointer-events-none",
          "absolute inset-x-0 -top-16 z-50 flex justify-center",
        )}
        exit={{
          opacity: 0,
          scale: ANIMATION_CONFIG.EXIT_SCALE,
          y: ANIMATION_CONFIG.EXIT_Y,
        }}
        initial={{
          opacity: 0,
          scale: ANIMATION_CONFIG.INITIAL_SCALE,
          y: ANIMATION_CONFIG.INITIAL_Y,
        }}
        key={showSuccess ? "success" : "generating"}
        transition={{
          duration: ANIMATION_CONFIG.DURATION,
          ease: ANIMATION_CONFIG.EASING,
        }}
      >
        <GenerationsIndicator
          isAnimating={!showSuccess}
          isSuccess={showSuccess}
          outputType={outputType}
          statusMessage={derivedStatusMessage}
          successMessage={resolvedSuccessMessage}
        />
      </motion.div>
    </AnimatePresence>
  );
}
