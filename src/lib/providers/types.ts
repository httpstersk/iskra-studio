/**
 * Provider abstraction types for image variation generation.
 *
 * @remarks
 * This module defines the strategy pattern interfaces for different
 * image generation providers (FAL, Replicate, etc.)
 */

/**
 * Input parameters for image variation generation.
 */
export interface VariationInput {
  imageUrls: string[];
  prompt: string;
  imageSize: { width: number; height: number };
  seed?: number;
  model?: string;
}

/**
 * Result from image variation generation.
 */
export interface VariationResult {
  imageUrl: string;
  seed?: number;
  replicateUrl?: string;
  provider: "fal" | "replicate";
}

/**
 * Strategy interface for image variation providers.
 */
export interface ImageVariationProvider {
  /**
   * Generates an image variation using the provider's API.
   *
   * @param input - The variation generation parameters
   * @returns The generated image result or an Error
   */
  generate(input: VariationInput): Promise<VariationResult | Error>;
}
