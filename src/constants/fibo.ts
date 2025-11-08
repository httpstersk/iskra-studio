/**
 * FIBO Model Constants
 *
 * Centralized configuration for Bria FIBO model parameters via official Bria API.
 * All FIBO-related constants should be defined here.
 *
 * @see https://docs.bria.ai/image-generation/v2-endpoints
 */

import { generateFiboSeed } from "@/utils/fibo-seed-generator";

/**
 * Default FIBO analysis parameters
 */
export const FIBO_ANALYSIS = {
  /** Extended timeout for batch operations in milliseconds */
  EXTENDED_TIMEOUT: 45000,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
} as const;

/**
 * Default FIBO generation parameters
 */
export const FIBO_GENERATION = {
  /** Default aspect ratio */
  DEFAULT_ASPECT_RATIO: "16:9" as const,
  /** Default guidance scale */
  DEFAULT_GUIDANCE_SCALE: 5,
  /** Default random seed */
  DEFAULT_SEED: getFiboSeed(),
  /** Default number of steps */
  DEFAULT_STEPS: 50,
} as const;

/**
 * Generates a random seed for FIBO operations.
 * Wrapper function for convenience when importing from constants.
 *
 * @returns A random seed number between 1 and 9,999
 */
export function getFiboSeed(): number {
  return generateFiboSeed();
}
