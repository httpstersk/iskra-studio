/**
 * Subscription management component.
 *
 * Displays current subscription plan and provides management options.
 */

"use client";

import { useState } from "react";
import { useQuota } from "@/hooks/use-quota";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SUBSCRIPTION_CONSTANTS } from "@/constants/subscription";
import { Calendar, CreditCard, ExternalLink } from "lucide-react";
import { UpgradeModal } from "./upgrade-modal";

interface SubscriptionManagementProps {
  className?: string;
}

/**
 * Subscription management settings component.
 *
 * Displays:
 * - Current plan (Free or Pro)
 * - Billing frequency for Pro users
 * - Next billing date
 * - Manage subscription button (Polar portal)
 * - Upgrade button for Free users
 * - Cancellation status if applicable
 *
 * @example
 * ```tsx
 * function SettingsPage() {
 *   return (
 *     <div>
 *       <h1>Settings</h1>
 *       <SubscriptionManagement />
 *     </div>
 *   );
 * }
 * ```
 */
export function SubscriptionManagement({
  className,
}: SubscriptionManagementProps) {
  const { error, isLoading, isPro, openCustomerPortal, subscription } =
    useSubscription();
  const { imagesLimit, videosLimit } = useQuota();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const nextBillingDate = subscription?.billingCycleEnd;
  const isCancelled = subscription?.cancelAtPeriodEnd;

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{SUBSCRIPTION_CONSTANTS.TITLES.MAIN}</CardTitle>
            <CardDescription>
              {SUBSCRIPTION_CONSTANTS.TITLES.DESCRIPTION}
            </CardDescription>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro
              ? SUBSCRIPTION_CONSTANTS.PRO_PLAN.TITLE
              : SUBSCRIPTION_CONSTANTS.FREE_PLAN.TITLE}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-6">
          {isPro ? (
            <>
              {/* Pro Plan Details */}
              <div className="rounded-lg border border-border/50 bg-accent/20 p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {SUBSCRIPTION_CONSTANTS.PRO_PLAN.TITLE}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {subscription?.billingInterval === "year"
                          ? SUBSCRIPTION_CONSTANTS.BILLING.ANNUAL_SUBTEXT
                          : SUBSCRIPTION_CONSTANTS.BILLING.MONTHLY_SUBTEXT}
                      </p>
                    </div>
                    {isCancelled && (
                      <Badge variant="destructive">
                        {SUBSCRIPTION_CONSTANTS.PRO_PLAN.CANCELLING}
                      </Badge>
                    )}
                  </div>

                  {/* Billing Info */}
                  <div className="space-y-2">
                    {nextBillingDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {isCancelled
                            ? SUBSCRIPTION_CONSTANTS.PRO_PLAN.ACCESS_UNTIL
                            : SUBSCRIPTION_CONSTANTS.PRO_PLAN.NEXT_BILLING}
                        </span>
                        <span className="font-medium text-foreground">
                          {formatDate(nextBillingDate)}
                        </span>
                      </div>
                    )}

                    {subscription?.polarSubscriptionId && (
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {SUBSCRIPTION_CONSTANTS.PRO_PLAN.STATUS}
                        </span>
                        <span className="font-medium capitalize text-foreground">
                          {subscription.status?.replace("_", " ") ?? "Active"}
                        </span>
                      </div>
                    )}
                  </div>

                  {isCancelled && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <p className="text-sm text-foreground">
                        {SUBSCRIPTION_CONSTANTS.PRO_PLAN.WILL_NOT_RENEW(
                          formatDate(nextBillingDate ?? null),
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Button */}
              <Button
                className="w-full"
                onClick={openCustomerPortal}
                variant="default"
              >
                <ExternalLink className="h-4 w-4" />
                {SUBSCRIPTION_CONSTANTS.CTA.MANAGE}
              </Button>
            </>
          ) : (
            <>
              {/* Free Plan Details */}
              <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    {SUBSCRIPTION_CONSTANTS.FREE_PLAN.TITLE}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {SUBSCRIPTION_CONSTANTS.FREE_PLAN.DESCRIPTION(
                      imagesLimit,
                      videosLimit,
                    )}
                  </p>
                  {nextBillingDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {SUBSCRIPTION_CONSTANTS.FREE_PLAN.QUOTA_RESET}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatDate(nextBillingDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upgrade CTA */}
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {SUBSCRIPTION_CONSTANTS.CTA.UPGRADE}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {/* This text was not extracted to constants as it's marketing copy that might change frequently, but could be extracted if desired */}
                        Get 20x more images, 24x more videos, and priority
                        support
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setShowUpgradeModal(true)}
                    variant="primary"
                  >
                    {SUBSCRIPTION_CONSTANTS.CTA.UPGRADE}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Help Text */}
          <div className="border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground">
              {SUBSCRIPTION_CONSTANTS.TITLES.NEED_HELP}
              <a
                className="text-foreground underline hover:text-primary"
                href={`mailto:${SUBSCRIPTION_CONSTANTS.LINKS.SUPPORT_EMAIL}`}
              >
                {SUBSCRIPTION_CONSTANTS.LINKS.SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        onOpenChange={setShowUpgradeModal}
        open={showUpgradeModal}
      />
    </>
  );
}
