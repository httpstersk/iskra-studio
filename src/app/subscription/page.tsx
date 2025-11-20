/**
 * Subscription Settings Page
 *
 * Allows users to manage their subscription and view quota usage.
 */

import { SubscriptionManagement } from "@/components/subscription/subscription-management";
import { QuotaDisplay } from "@/components/subscription/quota-display";
import { CanvasHeader } from "@/components/layout/canvas-header";

export default function SubscriptionPage() {
  return (
    <>
      <CanvasHeader />
      <div className="min-h-screen bg-background pt-14">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <header className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-foreground">
              Subscription & Usage
            </h1>
            <p className="text-muted-foreground">
              Manage your subscription plan and track your usage
            </p>
          </header>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Current Usage
              </h2>
              <QuotaDisplay />
            </section>

            <section>
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Plan Details
              </h2>
              <SubscriptionManagement />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
