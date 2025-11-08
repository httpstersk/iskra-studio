/**
 * Director Variations Generation API Route
 * Uses FIBO to analyze images, then uses FIBO generate to refine with director's style
 * Returns refined structured JSON prompts
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import { z } from "zod";

export const maxDuration = 60;

const requestSchema = z.object({
  directors: z.array(z.string()).min(1).max(12),
  imageUrl: z.string().url(),
  userContext: z.string().optional(),
});

/**
 * Builds director refinement prompt for FIBO
 */
function buildDirectorPrompt(director: string, userContext?: string): string {
  let prompt = `Make it look as though it were shot by a film director or cinematographer: ${director}.`;

  if (userContext) {
    prompt += ` ${userContext}`;
  }

  return prompt;
}

export const POST = createAuthenticatedHandler({
  schema: requestSchema,
  handler: async (input) => {
    const { imageUrl, directors, userContext } = input;

    // Build variation prompts for each director
    const variations = directors.map((director) =>
      buildDirectorPrompt(director, userContext)
    );

    // Generate FIBO variations using shared service
    const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
      imageUrl,
      variations,
    });

    // Transform result to match expected API response format
    const transformedPrompts = refinedPrompts.map((item, index) => ({
      director: directors[index],
      refinedStructuredPrompt: item.refinedStructuredPrompt,
    }));

    return {
      fiboAnalysis,
      refinedPrompts: transformedPrompts,
    };
  },
});
