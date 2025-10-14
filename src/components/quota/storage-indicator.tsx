"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuota } from "@/hooks/useQuota";
import { formatStorageSize, getQuotaProgressColor } from "@/utils/quota-utils";
import { Crown, HardDrive } from "lucide-react";

/**
 * Props for the StorageIndicator component.
 */
interface StorageIndicatorProps {
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Storage quota indicator component.
 *
 * Displays the user's storage usage with a progress bar and
 * formatted text. Shows different colors based on usage percentage
 * and provides tooltips with detailed information.
 *
 * @remarks
 * - Only renders for authenticated users
 * - Updates automatically as quota changes
 * - Shows "Upgrade" button for free-tier users approaching limits
 * - Color-coded based on usage: green (<60%), yellow (60-90%), red (>90%)
 *
 * @example
 * ```tsx
 * // Full indicator with progress bar
 * <StorageIndicator />
 * ```
 */
export function StorageIndicator({ className = "" }: StorageIndicatorProps) {
  const { quota, isLoading } = useQuota();
  const { tier, isAuthenticated } = useAuth();

  // Don't render if not authenticated
  if (!isAuthenticated || !quota) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-2 w-32 animate-pulse rounded-full bg-sidebar-accent/40 ring-1 ring-sidebar-border/50" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const usedText = formatStorageSize(quota.used);
  const limitText = formatStorageSize(quota.limit);
  const percentageText = `${quota.percentage}%`;
  const progressColor = getQuotaProgressColor(quota.percentage);

  return (
    <div
      className={`w-64 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/20 px-3 py-2 ${className}`}
    >
      <div className="flex items-center gap-1">
        <HardDrive className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Storage:</span>
        <span className="text-xs font-mono text-muted-foreground">
          {usedText}/{limitText}
        </span>
        <span className="ml-auto text-[11px] font-mono text-muted-foreground">
          {percentageText}
        </span>

        {tier === "free" && quota.isApproachingLimit && (
          <Button
            size="xs"
            variant="default"
            className="ml-2 h-6 text-[11px] px-2"
          >
            <Crown className="mr-1 h-3 w-3" />
            Upgrade
          </Button>
        )}
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sidebar-accent/40 ring-1 ring-sidebar-border/50">
        <div
          aria-label={`Storage used: ${percentageText}`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={quota.percentage}
          className={`h-full transition-all duration-300 ${progressColor}`}
          role="progressbar"
          style={{ width: `${Math.min(100, quota.percentage)}%` }}
        />
      </div>

      {quota.isApproachingLimit && (
        <p className="mt-1 text-[11px] text-yellow-600">
          {quota.isExceeded
            ? "Limit exceeded — remove assets to free space."
            : "Nearing limit — upgrade or remove unused assets."}
        </p>
      )}
    </div>
  );
}
