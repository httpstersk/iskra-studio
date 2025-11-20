/**
 * Upgrade modal component for Pro subscription.
 *
 * Displays Pro plan benefits and pricing options.
 */

"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import type { BillingInterval } from "@/types/subscription";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for upgrading to Pro subscription.
 *
 * Displays:
 * - Pro plan benefits
 * - Monthly and annual pricing options
 * - Upgrade CTA that redirects to Polar checkout
 *
 * @example
 * ```tsx
 * const [showUpgrade, setShowUpgrade] = useState(false);
 *
 * <Button onClick={() => setShowUpgrade(true)}>
 *   Upgrade to Pro
 * </Button>
 * <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
 * ```
 */
export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { upgrade, isUpgrading } = useSubscription();
  const [selectedInterval, setSelectedInterval] =
    useState<BillingInterval>("month");

  const handleUpgrade = async () => {
    await upgrade(selectedInterval);
  };

  // Pricing
  const monthlyPrice = 29;
  const annualPrice = 290; // ~$24/month
  const annualSavings = Math.round(
    ((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100
  );

  const pricePerMonth =
    selectedInterval === "month" ? monthlyPrice : Math.round(annualPrice / 12);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Upgrade to Pro</DialogTitle>
          </div>
          <DialogDescription>
            Unlock unlimited creative potential with our Pro plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              What's included:
            </h4>
            <div className="grid gap-3">
              <Benefit>480 images per month (20x more)</Benefit>
              <Benefit>96 videos per month (24x more)</Benefit>
              <Benefit>Priority generation queue</Benefit>
              <Benefit>Higher resolution outputs</Benefit>
              <Benefit>Advanced editing features</Benefit>
              <Benefit>Email support</Benefit>
            </div>
          </div>

          {/* Billing Interval Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              Choose billing cycle:
            </h4>
            <div className="grid gap-3">
              <BillingOption
                interval="month"
                selected={selectedInterval === "month"}
                onSelect={() => setSelectedInterval("month")}
                price={monthlyPrice}
                label="Monthly"
              />
              <BillingOption
                interval="year"
                selected={selectedInterval === "year"}
                onSelect={() => setSelectedInterval("year")}
                price={annualPrice}
                label="Annual"
                badge={`Save ${annualSavings}%`}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3 border-t border-border/50 pt-6">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {selectedInterval === "year"
                    ? "Billed annually"
                    : "Billed monthly"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">
                  ${pricePerMonth}
                  <span className="text-sm font-normal text-muted-foreground">
                    /month
                  </span>
                </p>
                {selectedInterval === "year" && (
                  <p className="text-xs text-muted-foreground">
                    ${annualPrice}/year
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {isUpgrading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>Upgrade to Pro</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Cancel anytime. No hidden fees.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BenefitProps {
  children: React.ReactNode;
}

function Benefit({ children }: BenefitProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-3 w-3 text-primary" />
      </div>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

interface BillingOptionProps {
  interval: BillingInterval;
  selected: boolean;
  onSelect: () => void;
  price: number;
  label: string;
  badge?: string;
}

function BillingOption({
  interval,
  selected,
  onSelect,
  price,
  label,
  badge,
}: BillingOptionProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between rounded-xl border-2 p-4 transition-all",
        selected
          ? "border-primary bg-primary/5"
          : "border-border/50 bg-transparent hover:border-border hover:bg-accent/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2",
            selected
              ? "border-primary bg-primary"
              : "border-border/50 bg-transparent"
          )}
        >
          {selected && <div className="h-2 w-2 rounded-full bg-background" />}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{label}</span>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            ${price}/{interval === "month" ? "month" : "year"}
          </p>
        </div>
      </div>
      {interval === "year" && (
        <div className="text-right">
          <p className="text-sm font-medium text-primary">
            ${Math.round(price / 12)}/mo
          </p>
        </div>
      )}
    </button>
  );
}
