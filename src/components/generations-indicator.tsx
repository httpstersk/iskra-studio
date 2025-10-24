"use client";

import { useEffect, useMemo, useState } from "react";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

interface GenerationsIndicatorProps {
  className?: string;
  speed?: number;
  isAnimating?: boolean;
  outputType?: "image" | "video";
  isSuccess?: boolean;
  statusMessage: string;
  successMessage?: string;
}

const VARIANT_STYLES = {
  image: {
    container: "",
    fill: "#EC0648",
    shimmerHighlight: "[--color-background:theme(colors.rose.300)]",
  },
  video: {
    container: "",
    fill: "#A855F7",
    shimmerHighlight: "[--color-background:theme(colors.purple.300)]",
  },
  success: {
    container: "border-emerald-500/40 text-emerald-400",
    fill: "#22c55e",
    shimmerHighlight: "",
  },
} as const;

export function GenerationsIndicator({
  className,
  speed = 150,
  isAnimating = true,
  outputType = "image",
  isSuccess = false,
  statusMessage,
  successMessage = "Done",
}: GenerationsIndicatorProps) {
  const [currentFrame, setCurrentFrame] = useState(0);

  const variant = isSuccess ? "success" : outputType;
  const styles = VARIANT_STYLES[variant];

  const fillColor = VARIANT_STYLES[outputType].fill;

  const svgFrames = useMemo(
    () => [
      <motion.svg aria-hidden
      key="frame-0"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
    </motion.svg>,

    // Frame 2
    <motion.svg aria-hidden
      key="frame-1"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
    </motion.svg>,

    // Frame 3
    <motion.svg aria-hidden
      key="frame-2"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
    >
      <rect x="5" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="5"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="10" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect
        x="10"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="3" y="3" width="3" height="3" fill="#EC0648" />
      <rect x="3" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="3" width="3" height="3" fill="#EC0648" />
    </motion.svg>,

    // Frame 4
    <motion.svg aria-hidden
      key="frame-3"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
    >
      <rect x="5" width="4" height="4" fill="#EC0648" />
      <rect width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="5" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" width="4" height="4" fill="#EC0648" />
      <rect x="15" width="4" height="4" fill="#EC0648" fillOpacity="0.08" />
      <rect x="10" y="15" width="4" height="4" fill="#EC0648" />
      <rect
        x="15"
        y="15"
        width="4"
        height="4"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="3" y="3" width="3" height="3" fill="#EC0648" />
      <rect x="3" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="13" width="3" height="3" fill="#EC0648" />
      <rect x="13" y="3" width="3" height="3" fill="#EC0648" />
    </motion.svg>,

    // Frame 5
    <motion.svg aria-hidden
      key="frame-4"
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
    >
      <rect
        x="3"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="3"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="13"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="13"
        y="3"
        width="3"
        height="3"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect x="5" width="4" height="4" fill="#EC0648" />
      <rect width="4" height="4" fill="#EC0648" />
      <rect x="5" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" width="4" height="4" fill="#EC0648" />
      <rect x="15" width="4" height="4" fill="#EC0648" />
      <rect x="10" y="15" width="4" height="4" fill="#EC0648" />
      <rect x="15" y="15" width="4" height="4" fill="#EC0648" />
      <rect
        x="19"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 19 5)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 4 5)"
        fill={fillColor}
      />
      <rect
        x="9"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 9 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="9"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 9 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 14 10)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="4"
        transform="rotate(90 14 5)"
        fill={fillColor}
        fillOpacity="0.08"
      />
      <rect
        x="19"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 19 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="10"
        width="4"
        height="4"
        transform="rotate(90 4 10)"
        fill={fillColor}
      />
      <rect
        x="4"
        y="15"
        width="4"
        height="4"
        transform="rotate(90 4 15)"
        fill={fillColor}
      />
    </motion.svg>,
    ],
    [fillColor],
  );

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % svgFrames.length);
    }, speed);

    return () => clearInterval(interval);
  }, [speed, isAnimating, svgFrames.length]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 rounded-xl border border-border/60 px-3 py-2",
        "bg-card/90 text-sm font-medium text-foreground backdrop-blur-md",
        styles.container,
        className,
      )}
      role="status"
    >
      {isSuccess ? (
        <span className="flex items-center gap-2 text-sm font-medium">
          <svg
            aria-hidden
            className="h-4 w-4 text-emerald-300"
            fill="none"
            viewBox="0 0 19 19"
          >
            <path
              d="M3 10L7 14L16 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          {successMessage}
        </span>
      ) : (
        <>
          <AnimatePresence mode="wait">
            {svgFrames[currentFrame]}
          </AnimatePresence>
          {isAnimating ? (
            <Shimmer
              as="span"
              className={cn(
                "whitespace-nowrap text-sm font-medium",
                "[--color-muted-foreground:theme(colors.zinc.500)]",
                styles.shimmerHighlight,
              )}
              duration={1.5}
            >
              {statusMessage}
            </Shimmer>
          ) : (
            <span className="whitespace-nowrap text-sm font-medium text-foreground/80">
              {statusMessage}
            </span>
          )}
        </>
      )}
    </div>
  );
}
