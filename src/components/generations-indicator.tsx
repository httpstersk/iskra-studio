"use client";

import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

interface GenerationsIndicatorProps {
  className?: string;
  isAnimating?: boolean;
  outputType?: "image" | "video";
  isSuccess?: boolean;
  statusMessage: string;
  successMessage?: string;
}

const VARIANT_STYLES = {
  image: {
    container: "",
    dot: "bg-rose-500/90",
    shimmerHighlight: "[--color-background:theme(colors.rose.300)]",
  },
  video: {
    container: "",
    dot: "bg-purple-500/90",
    shimmerHighlight: "[--color-background:theme(colors.purple.300)]",
  },
  success: {
    container: "border-emerald-500/40 text-emerald-400",
    dot: "bg-emerald-400",
    shimmerHighlight: "",
  },
} as const;

export function GenerationsIndicator({
  className,
  isAnimating = true,
  outputType = "image",
  isSuccess = false,
  statusMessage,
  successMessage = "Done",
}: GenerationsIndicatorProps) {
  const variant = isSuccess ? "success" : outputType;
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border border-border/60 px-3 py-2",
        "bg-card/90 text-sm font-medium text-foreground backdrop-blur-md",
        styles.container,
        className
      )}
      role="status"
    >
      <span
        className={cn(
          "relative inline-flex h-2.5 w-2.5 flex-shrink-0 items-center justify-center rounded-full",
          styles.dot
        )}
      >
        {!isSuccess && (
          <span className="absolute inset-0 animate-pulse rounded-full opacity-50" />
        )}
      </span>

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
      ) : isAnimating ? (
        <Shimmer
          as="span"
          className={cn(
            "whitespace-nowrap text-sm font-medium",
            "[--color-muted-foreground:theme(colors.zinc.500)]",
            styles.shimmerHighlight
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
    </div>
  );
}
