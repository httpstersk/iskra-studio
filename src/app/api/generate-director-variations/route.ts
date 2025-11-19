/**
 * Director Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with director's style
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
  directors: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input, _userId) => {
    const { imageUrl, directors, userContext } = input;

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
        count: directors.length,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Quota exceeded")) {
        throw error;
      }

      throw new Error("Failed to reserve quota for generation");
    }

    // Quota has been reserved, proceed with generation
    const result = await handleVariations(variationHandlers.director, {
      imageUrl,
      items: directors,
      userContext,
      itemKey: "director",
    });

    return result;
  },
});
