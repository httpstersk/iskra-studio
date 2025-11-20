/**
 * Subscription management component.
 *
 * Displays current subscription plan and provides management options.
 */

"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, CreditCard } from "lucide-react";
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
  const { subscription, isPro, openCustomerPortal, isLoading, error } =
    useSubscription();
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
      month: "long",
      day: "numeric",
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
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>
            {isPro ? "Pro" : "Free"}
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
                          Pro Plan
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {subscription?.billingInterval === "year"
                            ? "Billed annually"
                            : "Billed monthly"}
                        </p>
                      </div>
                      {isCancelled && (
                        <Badge variant="destructive">Cancelling</Badge>
                      )}
                    </div>

                    {/* Billing Info */}
                    <div className="space-y-2">
                      {nextBillingDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {isCancelled ? "Access until:" : "Next billing:"}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatDate(nextBillingDate)}
                          </span>
                        </div>
                      )}

                      {subscription?.polarSubscriptionId && (
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium capitalize text-foreground">
                            {subscription.status?.replace("_", " ") ?? "Active"}
                          </span>
                        </div>
                      )}
                    </div>

                    {isCancelled && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm text-foreground">
                          Your subscription will not renew. You'll have access
                          to Pro features until{" "}
                          {formatDate(nextBillingDate ?? null)}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manage Button */}
                <Button
                  onClick={openCustomerPortal}
                  variant="default"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4" />
                  Manage Subscription
                </Button>
              </>
            ) : (
              <>
                {/* Free Plan Details */}
                <div className="rounded-lg border border-border/50 bg-secondary/50 p-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Free Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      Limited to 24 images and 4 videos per month
                    </p>
                    {nextBillingDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Quota resets:
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
                          Upgrade to Pro
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Get 20x more images, 24x more videos, and priority
                          support
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      variant="primary"
                      className="w-full"
                    >
                      Upgrade to Pro
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
              Need help? Contact us at{" "}
              <a
                href="mailto:support@example.com"
                className="text-foreground underline hover:text-primary"
              >
                support@example.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
