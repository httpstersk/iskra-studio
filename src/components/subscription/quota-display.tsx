/**
 * Quota display component showing remaining images and videos.
 *
 * Displays quota usage with progress bars and warning states.
 */

"use client";

import { useQuota } from "@/hooks/use-quota";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuotaDisplayProps {
  className?: string;
  compact?: boolean;
}

/**
 * Displays user's quota usage with visual progress indicators.
 *
 * Shows:
 * - Images remaining with progress bar
 * - Videos remaining with progress bar
 * - Days until quota reset
 * - Warning state when quota > 80% used
 *
 * @example
 * ```tsx
 * <QuotaDisplay />
 * <QuotaDisplay compact /> // Compact version for sidebars
 * ```
 */
export function QuotaDisplay({ className, compact = false }: QuotaDisplayProps) {
  const {
    imagesUsed,
    imagesLimit,
    imagesRemaining,
    imagesPercentage,
    videosUsed,
    videosLimit,
    videosRemaining,
    videosPercentage,
    daysUntilReset,
    isWarning,
    isLoading,
  } = useQuota();

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)} compact={compact}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)} compact={compact}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Usage This Period
            </h3>
            {isWarning && (
              <Badge variant="destructive" className="text-xs">
                Low
              </Badge>
            )}
          </div>

          {/* Images Quota */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Images</span>
              <span
                className={cn(
                  "font-medium",
                  imagesPercentage >= 100 && "text-destructive",
                  imagesPercentage >= 80 && imagesPercentage < 100 && "text-warning"
                )}
              >
                {imagesRemaining} / {imagesLimit} left
              </span>
            </div>
            <ProgressBar
              percentage={imagesPercentage}
              variant={
                imagesPercentage >= 100
                  ? "destructive"
                  : imagesPercentage >= 80
                  ? "warning"
                  : "default"
              }
            />
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {imagesUsed} used
              </p>
            )}
          </div>

          {/* Videos Quota */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Videos</span>
              <span
                className={cn(
                  "font-medium",
                  videosPercentage >= 100 && "text-destructive",
                  videosPercentage >= 80 && videosPercentage < 100 && "text-warning"
                )}
              >
                {videosRemaining} / {videosLimit} left
              </span>
            </div>
            <ProgressBar
              percentage={videosPercentage}
              variant={
                videosPercentage >= 100
                  ? "destructive"
                  : videosPercentage >= 80
                  ? "warning"
                  : "default"
              }
            />
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {videosUsed} used
              </p>
            )}
          </div>

          {/* Reset Info */}
          {!compact && (
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground">
                Resets in {daysUntilReset} {daysUntilReset === 1 ? "day" : "days"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressBarProps {
  percentage: number;
  variant?: "default" | "warning" | "destructive";
}

function ProgressBar({ percentage, variant = "default" }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          variant === "default" && "bg-primary",
          variant === "warning" && "bg-warning",
          variant === "destructive" && "bg-destructive"
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}
