/**
 * Lighting Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with lighting scenarios
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import {
  handleVariations,
  variationHandlers,
} from "@/lib/api/variation-api-helper";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  lightingScenarios: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input, _userId) => {
    const { imageUrl, lightingScenarios, userContext } = input;

    // Initialize Convex client for quota operations
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    const convex = new ConvexHttpClient(
      requireEnv("NEXT_PUBLIC_CONVEX_URL", "Convex URL")
    );

    if (token) {
      convex.setAuth(token);
    }

    // Atomically check and reserve quota before generation
    // This prevents race conditions where parallel requests could exceed quota limits
    try {
      await convex.mutation(api.quotas.checkAndReserveQuota, {
        type: "image",
        count: lightingScenarios.length,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Quota exceeded")) {
        throw error;
      }

      throw new Error(
        `Failed to reserve quota for generation: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Quota has been reserved, proceed with generation
    try {
      const result = await handleVariations(variationHandlers.lighting, {
        imageUrl,
        items: lightingScenarios,
        userContext,
        itemKey: "lightingScenario",
      });
      return result;
    } catch (error) {
      // Refund quota if generation fails
      await convex.mutation(api.quotas.refundQuota, {
        type: "image",
        count: lightingScenarios.length,
      });
      throw error;
    }
  },
});
