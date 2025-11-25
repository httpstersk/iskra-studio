/**
 * Polar SDK Configuration
 *
 * This module initializes and exports the Polar SDK client for subscription management.
 * Used for creating checkout sessions, managing subscriptions, and handling payments.
 *
 * @see https://polar.sh/docs
 */

import { Polar } from "@polar-sh/sdk";
import { logger } from "./logger";

const log = logger.config;

/**
 * Validates required environment variables for Polar integration
 * @throws {Error} If required environment variables are missing
 */
function validatePolarConfig() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new Error(
      "POLAR_ACCESS_TOKEN is not set in environment variables. Please add it to your .env.local file.",
    );
  }

  if (!process.env.POLAR_ORGANIZATION_ID) {
    log.warn("POLAR_ORGANIZATION_ID is not set. Some operations may fail.");
  }

  if (!process.env.POLAR_PRODUCT_ID_MONTHLY) {
    log.warn(
      "POLAR_PRODUCT_ID_MONTHLY is not set. Subscription creation will fail.",
    );
  }

  if (!process.env.POLAR_PRODUCT_ID_ANNUAL) {
    log.warn(
      "POLAR_PRODUCT_ID_ANNUAL is not set. Subscription creation will fail.",
    );
  }
}

// Validate configuration on import (only in development)
if (process.env.NODE_ENV === "development") {
  validatePolarConfig();
}

/**
 * Polar SDK client instance
 *
 * Initialized with access token from environment variables.
 * Uses sandbox mode in development, production mode otherwise.
 */
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  // Use sandbox in development, production otherwise
  server:
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_MODE === "true"
      ? "sandbox"
      : undefined,
});

/**
 * Polar configuration constants
 */
export const POLAR_CONFIG = {
  organizationId: process.env.POLAR_ORGANIZATION_ID ?? "",
  products: {
    monthly: process.env.POLAR_PRODUCT_ID_MONTHLY ?? "",
    annual: process.env.POLAR_PRODUCT_ID_ANNUAL ?? "",
  },
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
} as const;

/**
 * Billing interval types
 */
export type BillingInterval = "month" | "year";

/**
 * Helper function to get product ID based on billing interval
 */
export function getProductIdForInterval(
  interval: BillingInterval,
): string | null {
  if (interval === "month") {
    return POLAR_CONFIG.products.monthly || null;
  }
  if (interval === "year") {
    return POLAR_CONFIG.products.annual || null;
  }
  return null;
}
