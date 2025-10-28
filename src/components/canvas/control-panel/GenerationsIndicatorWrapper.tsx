"use client";

import { GenerationsIndicator } from "@/components/generations-indicator";
import { cn } from "@/lib/utils";
import type { ActiveGeneration, ActiveVideoGeneration } from "@/types/canvas";
import { AnimatePresence, motion } from "motion/react";

interface GenerationsIndicatorWrapperProps {
  activeGenerations?: Map<string, ActiveGeneration>;
  activeGenerationsSize: number;
  activeVideoGenerations?: Map<string, ActiveVideoGeneration>;
  activeVideoGenerationsSize: number;
  isGenerating: boolean;
  showSuccess: boolean;
  statusMessage?: string;
  successMessage?: string;
}

const STATUS_MESSAGES = {
  analyzing: "Analyzing image",
  "creating-storyline": "Creating storyline",
  finalizing: "Finalizing",
  generating: "Generating",
  uploading: "Uploading image",
} as const;

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
  const shouldShow =
    activeGenerationsSize > 0 ||
    activeVideoGenerationsSize > 0 ||
    isGenerating ||
    showSuccess;

  if (!shouldShow) return null;

  const isVideoGeneration = activeVideoGenerationsSize > 0;
  const outputType = isVideoGeneration ? "video" : "image";
  const totalActive = activeGenerationsSize + activeVideoGenerationsSize;

  const derivedStatusMessage =
    statusMessage ??
    (() => {
      const noun = isVideoGeneration ? "video" : "image";
      const variations = totalActive === 1 ? "variation" : "variations";

      // Check for specific generation status if we have active generations
      const allGenerations = isVideoGeneration
        ? Array.from(activeVideoGenerations?.values() || [])
        : Array.from(activeGenerations?.values() || []);

      // Find the most prominent status (prioritize earlier stages)
      const statusPriority = [
        "analyzing",
        "creating-storyline",
        "finalizing",
        "generating",
        "uploading",
      ];

      let currentStatus = null;

      for (const status of statusPriority) {
        if (allGenerations.some((gen) => gen.status === status)) {
          currentStatus = status;
          break;
        }
      }

      // If we have a specific status, use it
      if (currentStatus && currentStatus !== "generating") {
        return STATUS_MESSAGES[currentStatus as keyof typeof STATUS_MESSAGES];
      }

      // Default to "Generating X variations"
      const verb =
        isGenerating || totalActive > 0 ? "Generating" : "Processing";
      return `${verb} ${noun} ${variations}`;
    })();

  const resolvedSuccessMessage = successMessage ?? "Done";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={cn(
          "pointer-events-none",
          "absolute inset-x-0 -top-16 z-50 flex justify-center"
        )}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        key={showSuccess ? "success" : "generating"}
        transition={{ duration: 0.2, ease: "easeInOut" }}
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
