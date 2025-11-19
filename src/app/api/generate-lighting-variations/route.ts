/**
 * Lighting Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with lighting scenarios
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import { handleVariations, variationHandlers } from "@/lib/api/variation-api-helper";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  lightingScenarios: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input, userId) => {
    const { imageUrl, lightingScenarios, userContext } = input;

    // Initialize Convex client for quota operations
    const convex = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL", "Convex URL"));
    convex.setAuth(requireEnv("CONVEX_DEPLOY_KEY", "Convex deploy key"));

    // Check quota before generation
    try {
      const quotaCheck = await convex.query(api.quotas.checkQuota, {
        type: "image",
      });

      if (!quotaCheck.hasQuota) {
        throw new Error(
          `Image quota exceeded. You've used ${quotaCheck.used}/${quotaCheck.limit} images this period.`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("quota exceeded")) {
        throw error;
      }
      console.error("Quota check failed:", error);
    }

    try {
      const result = await handleVariations(variationHandlers.lighting, {
        imageUrl,
        items: lightingScenarios,
        userContext,
        itemKey: "lightingScenario",
      });

      // Increment quota after successful generation
      try {
        await convex.mutation(api.quotas.incrementQuota, {
          type: "image",
        });
      } catch (error) {
        console.error("Failed to increment quota:", error);
      }

      return result;
    } catch (error) {
      // Don't increment quota on failed generation
      throw error;
    }
  },
});
