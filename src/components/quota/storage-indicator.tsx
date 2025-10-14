"use client";

import { Crown } from "lucide-react";
import { useQuota } from "@/hooks/useQuota";
import { useAuth } from "@/hooks/useAuth";
import {
  formatStorageSize,
  getQuotaColor,
  getQuotaProgressColor,
} from "@/utils/quota-utils";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/**
 * Props for the StorageIndicator component.
 */
interface StorageIndicatorProps {
  /** Whether to show the full indicator or just the percentage */
  compact?: boolean;

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
 *
 * // Compact version (percentage only)
 * <StorageIndicator compact />
 * ```
 */
export function StorageIndicator({
  compact = false,
  className = "",
}: StorageIndicatorProps) {
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
        <div className="h-2 w-32 animate-pulse rounded-full bg-gray-700" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  const usedText = formatStorageSize(quota.used);
  const limitText = formatStorageSize(quota.limit);
  const percentageText = `${quota.percentage}%`;
  const textColor = getQuotaColor(quota.percentage);
  const progressColor = getQuotaProgressColor(quota.percentage);

  // Compact version (just percentage)
  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <span className={`cursor-help text-sm ${textColor} ${className}`}>
            {percentageText}
          </span>
        </HoverCardTrigger>

        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Storage Used</span>
              {tier === "free" && (
                <Button size="sm" variant="default" className="h-6 text-xs">
                  <Crown className="mr-1 h-3 w-3" />
                  Upgrade
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{usedText}</span>
                <span>{limitText}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full transition-all duration-300 ${progressColor}`}
                  style={{ width: `${Math.min(100, quota.percentage)}%` }}
                />
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  // Full version with progress bar
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono ${textColor}`}>
          Storage: {usedText} / {limitText} ({percentageText})
        </span>

        {tier === "free" && quota.isApproachingLimit && (
          <Button size="sm" variant="default" className="h-7 text-xs">
            <Crown className="mr-1 h-3 w-3" />
            Upgrade
          </Button>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
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
        <p className="text-xs text-yellow-600">
          {quota.isExceeded
            ? "Storage limit exceeded. Delete assets to free up space."
            : "Approaching storage limit. Consider upgrading or deleting unused assets."}
        </p>
      )}
    </div>
  );
}
