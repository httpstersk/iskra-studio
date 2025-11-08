/**
 * Camera Angle Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with camera angles
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  cameraAngles: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

/**
 * Builds camera angle refinement prompt for FIBO
 */
function buildCameraAnglePrompt(
  cameraAngle: string,
  userContext?: string
): string {
  let prompt = `Apply this camera angle: ${cameraAngle}`;

  if (userContext) {
    prompt += `Context: ${userContext}`;
  }

  return prompt;
}

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input) => {
    const { imageUrl, cameraAngles, userContext } = input;

    // Build variation prompts for each camera angle
    const variations = cameraAngles.map((cameraAngle) =>
      buildCameraAnglePrompt(cameraAngle, userContext)
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      cameraAngle: cameraAngles[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return {
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    };
  },
});
