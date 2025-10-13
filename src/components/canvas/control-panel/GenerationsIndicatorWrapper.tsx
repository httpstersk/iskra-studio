"use client";

import { GenerationsIndicator } from "@/components/generations-indicator";
import { CONTROL_PANEL_STYLES } from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Props for the GenerationsIndicatorWrapper component
 */
interface GenerationsIndicatorWrapperProps {
  activeGenerationsSize: number;
  activeVideoGenerationsSize: number;
  isGenerating: boolean;
  showSuccess: boolean;
}

/**
 * Animated wrapper for the generations indicator
 */
export function GenerationsIndicatorWrapper({
  activeGenerationsSize,
  activeVideoGenerationsSize,
  isGenerating,
  showSuccess,
}: GenerationsIndicatorWrapperProps) {
  const shouldShow =
    activeGenerationsSize > 0 ||
    activeVideoGenerationsSize > 0 ||
    isGenerating ||
    showSuccess;

  if (!shouldShow) return null;

  const isVideoGeneration = activeVideoGenerationsSize > 0;
  const outputType = isVideoGeneration ? "video" : "image";

  const badgeStyle = showSuccess
    ? CONTROL_PANEL_STYLES.SUCCESS_BADGE
    : isVideoGeneration
      ? CONTROL_PANEL_STYLES.VIDEO_GENERATING_BADGE
      : CONTROL_PANEL_STYLES.GENERATING_BADGE;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, scale: 1, x: "-50%", y: 0 }}
        className={cn(
          "absolute z-50 -top-16 left-1/2",
          "rounded-xl",
          badgeStyle
        )}
        exit={{ opacity: 0, scale: 0.9, x: "-50%", y: -10 }}
        initial={{ opacity: 0, scale: 0.9, x: "-50%", y: -10 }}
        key={showSuccess ? "success" : "generating"}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <GenerationsIndicator
          className="w-5 h-5"
          isAnimating={!showSuccess}
          isSuccess={showSuccess}
          outputType={outputType}
        />
      </motion.div>
    </AnimatePresence>
  );
}
