/**
 * Lighting Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with lighting scenarios
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { handleVariations, variationHandlers } from "@/lib/api/variation-api-helper";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  lightingScenarios: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input) => {
    const { imageUrl, lightingScenarios, userContext } = input;

    return handleVariations(variationHandlers.lighting, {
      imageUrl,
      items: lightingScenarios,
      userContext,
      itemKey: "lightingScenario",
    });
  },
});
