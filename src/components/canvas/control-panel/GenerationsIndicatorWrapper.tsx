"use client";

import { GenerationsIndicator } from "@/components/generations-indicator";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

interface GenerationsIndicatorWrapperProps {
  activeGenerationsSize: number;
  activeVideoGenerationsSize: number;
  isGenerating: boolean;
  showSuccess: boolean;
  statusMessage?: string;
  successMessage?: string;
}

export function GenerationsIndicatorWrapper({
  activeGenerationsSize,
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
      const variations =
        totalActive === 1 ? "variation" : "variations";
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
          "absolute z-50 -top-16 left-1/2 -translate-x-1/2",
          "pointer-events-none"
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
