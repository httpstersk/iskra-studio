/**
 * Subscription Success Page
 *
 * Displayed after successful checkout completion.
 * Shows success message and redirects to subscription page.
 */

"use client";

import { CanvasHeader } from "@/components/layout/canvas-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  return (
    <>
      <CanvasHeader />
      <div className="min-h-screen bg-background pt-14 flex items-center justify-center">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-green-500/10 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Welcome to Pro!
              </h1>
              <p className="text-muted-foreground text-lg">
                Your subscription has been successfully activated.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push("/subscription")} size="lg">
                  Go to Subscription Page
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  size="lg"
                  variant="primary"
                >
                  Return Home
                </Button>
              </div>
            </div>

            {/* Troubleshooting Note */}
            <div className="pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground">
                If your Pro features don't appear within a few minutes, please
                refresh the page or contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
