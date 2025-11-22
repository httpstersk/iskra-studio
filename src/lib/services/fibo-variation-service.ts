/**
 * FIBO Variation Service
 *
 * Unified service for generating image variations with FIBO refinement.
 * Handles both director-style and camera angle variations using the same workflow:
 * 1. Analyze image with FIBO to get structured prompt
 * 2. Refine structured prompt with variation-specific text prompts
 * 3. Return refined structured prompts for downstream image generation
 */

import { FIBO_ANALYSIS, getFiboSeed } from "@/constants/fibo";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import { generateStructuredPrompt } from "@/lib/services/bria-client";
import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";

/**
 * Configuration for FIBO variation generation
 */
export interface FiboVariationConfig {
  /** Aspect ratio for generated images */
  aspectRatio?: string;
  /** Guidance scale for generation */
  guidanceScale?: number;
  /** Image URLs to analyze and refine */
  imageUrls: string[];
  /** Random seed for reproducibility */
  seed?: number;
  /** Number of generation steps */
  stepsNum?: number;
  /** Timeout for analysis in milliseconds */
  timeout?: number;
  /** Text prompts to refine the structured prompt */
  variations: string[];
}

/**
 * Result of a single variation refinement
 */
export interface VariationRefinement<T = string> {
  /** Refined FIBO structured prompt */
  refinedStructuredPrompt: FiboStructuredPrompt;
  /** Original variation identifier (director name, camera angle, etc.) */
  variation: T;
}

/**
 * Complete variation generation result
 */
export interface FiboVariationResult<T = string> {
  /** Original FIBO analysis of the input image */
  fiboAnalysis: FiboStructuredPrompt;
  /** Array of refined prompts, one per variation */
  refinedPrompts: Array<VariationRefinement<T>>;
}

/**
 * Generates image variations using FIBO analysis + text prompt refinement
 *
 * This is the core DRY function that both director and camera angle variations use.
 * It performs a single FIBO analysis, then refines the structured prompt multiple times
 * with different text prompts.
 *
 * @param config - Configuration including image URL and variation text prompts
 * @returns Promise resolving to FIBO analysis and refined prompts
 * @throws Error if analysis or refinement fails
 *
 * @example
 * ```typescript
 * // Director variations
 * const result = await generateFiboVariations({
 *   imageUrls: ["https://example.com/image.jpg"],
 *   variations: [
 *     "Make it look as though it were shot by Christopher Nolan",
 *     "Make it look as though it were shot by Wes Anderson"
 *   ]
 * });
 *
 * // Camera angle variations
 * const result = await generateFiboVariations({
 *   imageUrls: ["https://example.com/image.jpg"],
 *   variations: [
 *     "Apply this camera angle: Low angle",
 *     "Apply this camera angle: Bird's eye view"
 *   ]
 * });
 * ```
 */
export async function generateFiboVariations<T = string>(
  config: FiboVariationConfig
): Promise<FiboVariationResult<T>> {
  const {
    imageUrls,
    seed = getFiboSeed(),
    timeout = FIBO_ANALYSIS.EXTENDED_TIMEOUT,
    variations,
  } = config;

  // Step 1: Analyze image with FIBO to get baseline structured prompt
  const fiboAnalysisResult = await analyzeFiboImageWithRetry({
    imageUrls,
    seed,
    timeout,
  });

  // Check if result is an error (has payload property)
  if ('payload' in fiboAnalysisResult) {
    throw new Error(`FIBO analysis failed: ${fiboAnalysisResult.payload.message || 'Unknown error'}`);
  }

  const fiboAnalysis = fiboAnalysisResult;

  const refinementPromises = variations.map(async (variationPrompt) => {
    // Call Bria API to refine structured prompt with variation text prompt
    // We pass the original structured_prompt + variation text prompt
    // Bria will return a refined structured_prompt without generating the image
    const result = await generateStructuredPrompt(
      {
        prompt: variationPrompt,
        seed,
        structured_prompt: JSON.stringify(fiboAnalysis),
        sync: true,
      },
      timeout
    );

    // Check if result is an error (has payload property)
    if ('payload' in result) {
      throw new Error(`FIBO refinement failed: ${result.payload.message || 'Unknown error'}`);
    }

    // Parse the refined structured prompt
    const refinedStructuredPrompt: FiboStructuredPrompt = JSON.parse(
      result.structured_prompt
    );

    return {
      refinedStructuredPrompt,
      variation: variationPrompt as T,
    };
  });

  const refinedPrompts = await Promise.all(refinementPromises);

  return {
    fiboAnalysis,
    refinedPrompts,
  };
}
