/**
 * Upgrade modal component.
 *
 * Displays pricing plans and benefits for upgrading to Pro.
 */

"use client";

import { useState } from "react";
import { usePolarProducts } from "@/hooks/use-polar-products";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { SUBSCRIPTION_CONSTANTS } from "@/constants/subscription";
import { Check, Loader2, Sparkles } from "lucide-react";

interface UpgradeModalProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * Modal for upgrading to Pro subscription.
 *
 * Features:
 * - Monthly/Annual billing toggle
 * - Dynamic pricing from Polar
 * - Feature comparison list
 * - Checkout initiation
 */
export function UpgradeModal({ onOpenChange, open }: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "year"
  );
  const { error, isUpgrading, upgrade } = useSubscription();
  const { isLoading, products } = usePolarProducts();

  // Pricing
  const monthlyProduct = products?.monthly;
  const annualProduct = products?.annual;

  const monthlyPrice =
    monthlyProduct?.prices.find((p) => p.recurringInterval === "month")
      ?.priceAmount ?? 0;
  const annualPrice =
    annualProduct?.prices.find((p) => p.recurringInterval === "year")
      ?.priceAmount ?? 0;

  // Calculate monthly equivalent for annual plan (prices are in cents)
  const annualMonthlyEquivalent = Math.round(annualPrice / 100 / 12);
  const displayMonthlyPrice = monthlyPrice / 100;
  const displayAnnualPrice = annualPrice / 100;

  const handleUpgrade = async () => {
    await upgrade(billingInterval);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            {SUBSCRIPTION_CONSTANTS.TITLES.MODAL_TITLE}
          </DialogTitle>
          <DialogDescription>
            {SUBSCRIPTION_CONSTANTS.TITLES.MODAL_DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label
              className={cn(
                "cursor-pointer",
                billingInterval === "month"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              htmlFor="billing-switch"
            >
              {SUBSCRIPTION_CONSTANTS.BILLING.MONTHLY}
            </Label>
            <Switch
              checked={billingInterval === "year"}
              id="billing-switch"
              onCheckedChange={(checked) =>
                setBillingInterval(checked ? "year" : "month")
              }
            />
            <Label
              className={cn(
                "cursor-pointer",
                billingInterval === "year"
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              htmlFor="billing-switch"
            >
              {SUBSCRIPTION_CONSTANTS.BILLING.ANNUAL}
              <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/20">
                {SUBSCRIPTION_CONSTANTS.BILLING.ANNUAL_BADGE}
              </Badge>
            </Label>
          </div>

          {/* Pricing Card */}
          <div className="relative overflow-hidden rounded-xl border border-primary/50 bg-primary/5 p-6">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <h3 className="text-lg font-medium text-foreground">
                {SUBSCRIPTION_CONSTANTS.PRO_PLAN.TITLE}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                {isLoading ? (
                  <Skeleton className="h-12 w-32" />
                ) : (
                  <>
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      $
                      {billingInterval === "year"
                        ? annualMonthlyEquivalent
                        : displayMonthlyPrice}
                    </span>
                    <span className="text-muted-foreground">
                      {SUBSCRIPTION_CONSTANTS.BILLING.PER_MONTH}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {billingInterval === "year"
                  ? `$${displayAnnualPrice} ${SUBSCRIPTION_CONSTANTS.BILLING.PER_YEAR}`
                  : `${SUBSCRIPTION_CONSTANTS.BILLING.MONTHLY_SUBTEXT}`}
              </p>
            </div>

            {/* Features */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-foreground">
                {SUBSCRIPTION_CONSTANTS.TITLES.WHATS_INCLUDED}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.IMAGES}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.VIDEOS}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.GENERATION_QUEUE}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.RESOLUTION}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.EDITING}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  {SUBSCRIPTION_CONSTANTS.BENEFITS.SUPPORT}
                </li>
              </ul>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full"
            disabled={isLoading || isUpgrading}
            onClick={handleUpgrade}
            size="lg"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {SUBSCRIPTION_CONSTANTS.CTA.PROCESSING}
              </>
            ) : (
              SUBSCRIPTION_CONSTANTS.CTA.UPGRADE
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {SUBSCRIPTION_CONSTANTS.CTA.CANCEL_ANYTIME}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
