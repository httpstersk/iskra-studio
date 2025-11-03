/**
 * FIBO Variation Service
 *
 * Unified service for generating image variations with FIBO refinement.
 * Handles both director-style and camera angle variations using the same workflow:
 * 1. Analyze image with FIBO to get structured prompt
 * 2. Refine structured prompt with variation-specific text prompts
 * 3. Return refined structured prompts for downstream image generation
 */

import {
  FIBO_ANALYSIS,
  FIBO_ENDPOINTS,
  FIBO_GENERATION,
} from "@/constants/fibo";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import { analyzeFiboImageWithRetry } from "@/lib/services/fibo-image-analyzer";
import { createFalClientWithKey } from "@/lib/services/fal-client-factory";

/**
 * Configuration for FIBO variation generation
 */
export interface FiboVariationConfig {
  /** Aspect ratio for generated images */
  aspectRatio?: string;
  /** Guidance scale for generation */
  guidanceScale?: number;
  /** Image URL to analyze and refine */
  imageUrl: string;
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
 *   imageUrl: "https://example.com/image.jpg",
 *   variations: [
 *     "Make it look as though it were shot by Christopher Nolan",
 *     "Make it look as though it were shot by Wes Anderson"
 *   ]
 * });
 *
 * // Camera angle variations
 * const result = await generateFiboVariations({
 *   imageUrl: "https://example.com/image.jpg",
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
    aspectRatio = FIBO_GENERATION.DEFAULT_ASPECT_RATIO,
    guidanceScale = FIBO_GENERATION.DEFAULT_GUIDANCE_SCALE,
    imageUrl,
    seed = FIBO_GENERATION.DEFAULT_SEED,
    stepsNum = FIBO_GENERATION.DEFAULT_STEPS,
    timeout = FIBO_ANALYSIS.EXTENDED_TIMEOUT,
    variations,
  } = config;

  // Step 1: Analyze image with FIBO to get baseline structured prompt
  const fiboAnalysis = await analyzeFiboImageWithRetry({
    imageUrl,
    seed,
    timeout,
  });

  // Step 2: Create FAL client for refinement operations
  const falClient = createFalClientWithKey();

  // Step 3: Refine the structured prompt for each variation in parallel
  const refinementPromises = variations.map(async (variationPrompt) => {
    // Call FIBO generate with original structured_prompt + variation text prompt
    // sync: false means we only get the refined structured_prompt, not the generated image
    const result = await falClient.subscribe(FIBO_ENDPOINTS.GENERATE, {
      input: {
        aspect_ratio: aspectRatio,
        guidance_scale: guidanceScale,
        image_url: imageUrl,
        prompt: variationPrompt,
        seed,
        steps_num: stepsNum,
        structured_prompt: fiboAnalysis,
        sync: false,
      },
      logs: true,
    });

    // Extract refined structured_prompt from FIBO response
    const resultData = result.data as any;
    const refinedStructuredPrompt =
      resultData?.structured_prompt || fiboAnalysis;

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
