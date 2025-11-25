/**
 * Quota exceeded modal component.
 *
 * Displayed when user attempts to generate content but has exceeded their quota.
 */

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuota } from "@/hooks/use-quota";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import type { GenerationType } from "@/types/subscription";
import { AlertCircle, Calendar } from "lucide-react";
import { useState } from "react";
import { UpgradeModal } from "./upgrade-modal";

interface QuotaExceededModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotaType: GenerationType;
}

/**
 * Modal displayed when quota is exceeded.
 *
 * Shows:
 * - Error message explaining quota exceeded
 * - Which quota was exceeded (images or videos)
 * - Current usage statistics
 * - Upgrade CTA for Free users
 * - Quota reset date as alternative
 *
 * @example
 * ```tsx
 * const [showQuotaError, setShowQuotaError] = useState(false);
 * const [quotaType, setQuotaType] = useState<GenerationType>("image");
 *
 * // When generation fails due to quota
 * if (!canGenerate("image")) {
 *   setQuotaType("image");
 *   setShowQuotaError(true);
 * }
 *
 * <QuotaExceededModal
 *   open={showQuotaError}
 *   onOpenChange={setShowQuotaError}
 *   quotaType={quotaType}
 * />
 * ```
 */
export function QuotaExceededModal({
  open,
  onOpenChange,
  quotaType,
}: QuotaExceededModalProps) {
  const { isFree } = useSubscription();
  const {
    imagesUsed,
    imagesLimit,
    videosUsed,
    videosLimit,
    daysUntilReset,
    resetDate,
  } = useQuota();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isImageQuota = quotaType === "image";
  const quotaUsed = isImageQuota ? imagesUsed : videosUsed;
  const quotaLimit = isImageQuota ? imagesLimit : videosLimit;
  const quotaLabel = isImageQuota ? "image" : "video";
  const quotaLabelPlural = isImageQuota ? "images" : "videos";

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleUpgradeClick = () => {
    onOpenChange(false);
    setShowUpgradeModal(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <DialogTitle>Quota Limit Reached</DialogTitle>
            </div>
            <DialogDescription>
              You've reached your {quotaLabel} generation limit for this period
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Usage */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {quotaLabelPlural.charAt(0).toUpperCase() +
                      quotaLabelPlural.slice(1)}{" "}
                    Used
                  </span>
                  <Badge variant="destructive">
                    {quotaUsed} / {quotaLimit}
                  </Badge>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-destructive transition-all"
                    style={{ width: "100%" }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  You've used all {quotaLimit} {quotaLabelPlural} included in
                  your {isFree ? "Free" : "Pro"} plan this period.
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {isFree ? (
                <>
                  {/* Upgrade Option */}
                  <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">
                            Upgrade to Pro
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Get {isImageQuota ? "130 images" : "25 videos"} per
                            month
                            {isImageQuota ? " (10x more)" : " (8x more)"}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleUpgradeClick}
                        variant="primary"
                        className="w-full"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        or wait for reset
                      </span>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Reset Info */}
              <div
                className={cn(
                  "rounded-lg border border-border/50 p-4",
                  isFree ? "bg-secondary/50" : "bg-accent/20",
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-medium text-foreground">
                      Quota Resets
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your quota will reset in{" "}
                    <span className="font-medium text-foreground">
                      {daysUntilReset} {daysUntilReset === 1 ? "day" : "days"}
                    </span>
                  </p>
                  {resetDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(resetDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="border-t border-border/50 pt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="default"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
