/**
 * Custom hook for subscription management.
 *
 * Provides functions to fetch subscription status and manage upgrades/cancellations.
 * Integrates with Convex backend and Polar API for subscription operations.
 */

"use client";

import { useQuery } from "convex/react";
import { useCallback, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type {
  BillingInterval,
  SubscriptionInfo,
  SubscriptionTier,
} from "@/types/subscription";
import { useAuth } from "./useAuth";

/**
 * Return type for the useSubscription hook.
 */
interface UseSubscriptionReturn {
  /** Current subscription information */
  subscription: SubscriptionInfo | null;

  /** Whether subscription data is loading */
  isLoading: boolean;

  /** Whether an upgrade is in progress */
  isUpgrading: boolean;

  /** Current subscription tier */
  tier: SubscriptionTier;

  /** Whether user has an active Pro subscription */
  isPro: boolean;

  /** Whether user is on Free tier */
  isFree: boolean;

  /** Initiates upgrade to Pro tier */
  upgrade: (billingInterval: BillingInterval) => Promise<void>;

  /** Opens Polar customer portal for subscription management */
  openCustomerPortal: () => Promise<void>;

  /** Error message if any operation failed */
  error: string | null;
}

/**
 * Custom hook for managing subscriptions.
 *
 * Provides subscription status and functions for upgrading/managing
 * subscriptions through Polar. Automatically handles loading
 * states and error handling.
 *
 * @remarks
 * - All operations require user authentication
 * - Subscriptions are managed through Polar
 * - Failed operations set error state instead of throwing
 *
 * @example
 * ```tsx
 * function SubscriptionSettings() {
 *   const {
 *     subscription,
 *     isPro,
 *     upgrade,
 *     openCustomerPortal,
 *     isUpgrading,
 *   } = useSubscription();
 *
 *   const handleUpgrade = async () => {
 *     await upgrade("month");
 *   };
 *
 *   return (
 *     <div>
 *       {isPro ? (
 *         <button onClick={openCustomerPortal}>
 *           Manage Subscription
 *         </button>
 *       ) : (
 *         <button onClick={handleUpgrade} disabled={isUpgrading}>
 *           Upgrade to Pro
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSubscription(): UseSubscriptionReturn {
  const { isAuthenticated } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convex query - only run when authenticated
  const subscriptionData = useQuery(
    api.subscriptions.getSubscriptionStatus,
    isAuthenticated ? {} : "skip"
  );

  // Memoize subscription info to avoid unnecessary recalculations
  const subscription = useMemo((): SubscriptionInfo | null => {
    if (!subscriptionData) return null;

    return {
      tier: subscriptionData.tier,
      status: subscriptionData.subscriptionStatus,
      polarCustomerId: subscriptionData.polarCustomerId,
      polarSubscriptionId: subscriptionData.polarSubscriptionId,
      billingInterval: null, // TODO: Store this in user record
      billingCycleStart: subscriptionData.billingCycleStart
        ? new Date(subscriptionData.billingCycleStart)
        : null,
      billingCycleEnd: subscriptionData.billingCycleEnd
        ? new Date(subscriptionData.billingCycleEnd)
        : null,
      cancelAtPeriodEnd: subscriptionData.subscriptionStatus === "cancelled",
    };
  }, [subscriptionData]);

  const tier = subscription?.tier ?? "free";
  const isPro = tier === "pro";
  const isFree = tier === "free";

  /**
   * Initiates upgrade to Pro tier by creating a Polar checkout session.
   */
  const upgrade = useCallback(
    async (billingInterval: BillingInterval): Promise<void> => {
      try {
        setIsUpgrading(true);
        setError(null);

        // Call API route to create Polar checkout session
        const response = await fetch("/api/polar/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ billingInterval }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create checkout session");
        }

        const { checkoutUrl } = await response.json();

        // Redirect to Polar checkout
        window.location.href = checkoutUrl;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upgrade subscription";
        setError(errorMessage);
        console.error("Upgrade error:", err);
      } finally {
        setIsUpgrading(false);
      }
    },
    []
  );

  /**
   * Opens Polar customer portal for subscription management.
   */
  const openCustomerPortal = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Call API route to create customer portal session
      const response = await fetch("/api/polar/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to open customer portal");
      }

      const { portalUrl } = await response.json();

      // Redirect to Polar customer portal
      window.location.href = portalUrl;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to open customer portal";
      setError(errorMessage);
      console.error("Customer portal error:", err);
    }
  }, []);

  return {
    subscription,
    isLoading: subscriptionData === undefined && isAuthenticated,
    isUpgrading,
    tier,
    isPro,
    isFree,
    upgrade,
    openCustomerPortal,
    error,
  };
}
