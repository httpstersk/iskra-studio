/**
 * Generic helper for creating variation API handlers
 * Reduces duplication across director, camera angle, and lighting variation routes
 */

import { generateFiboVariations } from "@/lib/services/fibo-variation-service";

export interface VariationConfig<T extends string> {
  /**
   * Key name for the variation type in request/response
   * e.g., 'director', 'cameraAngle', 'lightingScenario'
   */
  itemKey: T;

  /**
   * Function to build the variation prompt
   */
  buildPrompt: (item: string, userContext?: string) => string;
}

export interface VariationInput<T extends string> {
  imageUrl: string;
  items: string[];
  userContext?: string;
  itemKey: T;
}

export interface VariationOutput<T extends string> {
  fiboAnalysis: any;
  refinedPrompts: Array<{
    [K in T]: string;
  } & {
    refinedStructuredPrompt: any;
  }>;
}

/**
 * Generic variation handler that works for any variation type
 */
export async function handleVariations<T extends string>(
  config: VariationConfig<T>,
  input: VariationInput<T>
): Promise<VariationOutput<T>> {
  const { imageUrl, items, userContext } = input;

  // Build variation prompts for each item
  const variations = items.map((item) => config.buildPrompt(item, userContext));

  // Generate FIBO variations using shared service
  const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
    imageUrl,
    variations,
  });

  // Transform result to match expected API response format
  const transformedPrompts = refinedPrompts.map((item, index) => ({
    [config.itemKey]: items[index],
    refinedStructuredPrompt: item.refinedStructuredPrompt,
  })) as VariationOutput<T>["refinedPrompts"];

  return {
    fiboAnalysis,
    refinedPrompts: transformedPrompts,
  };
}

/**
 * Pre-configured variation handlers for common types
 */
export const variationHandlers = {
  director: {
    itemKey: "director" as const,
    buildPrompt: (director: string, userContext?: string) => {
      let prompt = `Make it look as though it were shot by a film director or cinematographer: ${director}.`;
      if (userContext) {
        prompt += ` ${userContext}`;
      }
      return prompt;
    },
  },

  cameraAngle: {
    itemKey: "cameraAngle" as const,
    buildPrompt: (cameraAngle: string, userContext?: string) => {
      let prompt = `Apply this camera angle: ${cameraAngle}`;
      if (userContext) {
        prompt += ` Context: ${userContext}`;
      }
      return prompt;
    },
  },

  lighting: {
    itemKey: "lightingScenario" as const,
    buildPrompt: (lightingScenario: string, userContext?: string) => {
      let prompt = `Apply this lighting: ${lightingScenario}`;
      if (userContext) {
        prompt += `\n\nContext: ${userContext}`;
      }
      return prompt;
    },
  },
};
