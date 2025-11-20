/**
 * Subscription Settings Page
 *
 * Allows users to manage their subscription and view quota usage.
 */

import { SubscriptionManagement } from "@/components/subscription/subscription-management";
import { QuotaDisplay } from "@/components/subscription/quota-display";
import { CanvasHeader } from "@/components/layout/canvas-header";
import { Sparkles } from "lucide-react";

export default function SubscriptionPage() {
  return (
    <>
      <CanvasHeader />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Subscription & Usage
              </h1>
            </div>
            <p className="text-muted-foreground">
              Manage your subscription plan and track your usage
            </p>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Quota Display */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Current Usage
              </h2>
              <QuotaDisplay />
            </div>

            {/* Subscription Management */}
            <div>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Plan Details
              </h2>
              <SubscriptionManagement />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
