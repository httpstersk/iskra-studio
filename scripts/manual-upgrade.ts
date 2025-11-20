/**
 * Manual Subscription Upgrade Script
 *
 * Temporary workaround to manually activate Pro subscription when webhooks fail.
 * Use this only when you can't set up webhook forwarding with ngrok.
 *
 * Usage:
 *   USER_ID=user_xxx \
 *   POLAR_CUSTOMER_ID=36080f13-9ef9-437a-bd2f-89d0fabbf861 \
 *   POLAR_SUBSCRIPTION_ID=fa505e58-f54d-4711-9dbf-f392819243b0 \
 *   npx tsx scripts/manual-upgrade.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const USER_ID = process.env.USER_ID;
const POLAR_CUSTOMER_ID = process.env.POLAR_CUSTOMER_ID;
const POLAR_SUBSCRIPTION_ID = process.env.POLAR_SUBSCRIPTION_ID;

async function main() {
  // Validate environment variables
  if (!CONVEX_URL) {
    console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not set in .env.local");
    process.exit(1);
  }

  if (!USER_ID) {
    console.error("❌ Error: USER_ID not provided");
    console.log("\nUsage:");
    console.log("  USER_ID=user_xxx \\");
    console.log("  POLAR_CUSTOMER_ID=cus_xxx \\");
    console.log("  POLAR_SUBSCRIPTION_ID=sub_xxx \\");
    console.log("  npx tsx scripts/manual-upgrade.ts");
    process.exit(1);
  }

  if (!POLAR_CUSTOMER_ID || !POLAR_SUBSCRIPTION_ID) {
    console.error("❌ Error: POLAR_CUSTOMER_ID and POLAR_SUBSCRIPTION_ID required");
    console.log("\nYou can find these in your Polar webhook payload:");
    console.log("  - customer_id: " + (POLAR_CUSTOMER_ID || "36080f13-9ef9-437a-bd2f-89d0fabbf861"));
    console.log("  - subscription.id: " + (POLAR_SUBSCRIPTION_ID || "fa505e58-f54d-4711-9dbf-f392819243b0"));
    process.exit(1);
  }

  console.log("🚀 Starting manual subscription upgrade...\n");
  console.log("Configuration:");
  console.log(`  User ID: ${USER_ID}`);
  console.log(`  Polar Customer ID: ${POLAR_CUSTOMER_ID}`);
  console.log(`  Polar Subscription ID: ${POLAR_SUBSCRIPTION_ID}`);
  console.log(`  Convex URL: ${CONVEX_URL}\n`);

  const convex = new ConvexHttpClient(CONVEX_URL);

  // Set billing cycle: current month
  const now = Date.now();
  const billingCycleStart = now;
  const billingCycleEnd = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now

  try {
    await convex.action(api.subscriptions.handleUpgrade, {
      userId: USER_ID,
      polarCustomerId: POLAR_CUSTOMER_ID,
      polarSubscriptionId: POLAR_SUBSCRIPTION_ID,
      billingCycleStart,
      billingCycleEnd,
    });

    console.log("✅ Success! User upgraded to Pro tier");
    console.log(`\n📅 Billing cycle:`);
    console.log(`  Start: ${new Date(billingCycleStart).toLocaleString()}`);
    console.log(`  End: ${new Date(billingCycleEnd).toLocaleString()}`);
    console.log(`\n💎 Pro benefits activated:`);
    console.log(`  - 480 images per month`);
    console.log(`  - 96 videos per month`);
    console.log(`\n🎉 You can now use your Pro subscription!`);
  } catch (error) {
    console.error("❌ Error upgrading subscription:", error);
    process.exit(1);
  }
}

main();
