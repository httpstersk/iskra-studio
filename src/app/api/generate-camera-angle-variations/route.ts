/**
 * Camera Angle Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with camera angles
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { handleVariations, variationHandlers } from "@/lib/api/variation-api-helper";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  cameraAngles: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input) => {
    const { imageUrl, cameraAngles, userContext } = input;

    return handleVariations(variationHandlers.cameraAngle, {
      imageUrl,
      items: cameraAngles,
      userContext,
      itemKey: "cameraAngle",
    });
  },
});
