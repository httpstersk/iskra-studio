/**
 * Lighting Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with lighting scenarios
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  imageUrl: z.string().url(),
  lightingScenarios: z.array(z.string()).min(1).max(12),
  userContext: z.string().optional(),
});

/**
 * Builds lighting scenario refinement prompt for FIBO
 */
function buildLightingPrompt(
  lightingScenario: string,
  userContext?: string
): string {
  let prompt = `Apply this lighting: ${lightingScenario}`;

  if (userContext) {
    prompt += `\n\nContext: ${userContext}`;
  }

  return prompt;
}

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input) => {
    const { imageUrl, lightingScenarios, userContext } = input;

    // Build variation prompts for each lighting scenario
    const variations = lightingScenarios.map((lightingScenario) =>
      buildLightingPrompt(lightingScenario, userContext)
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      lightingScenario: lightingScenarios[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return {
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    };
  },
});
