/**
 * FIBO Model Constants
 *
 * Centralized configuration for Bria FIBO model parameters.
 * All FIBO-related constants should be defined here.
 */

import { generateFiboSeed } from "@/utils/fibo-seed-generator";

/**
 * Default FIBO analysis parameters
 */
export const FIBO_ANALYSIS = {
  /** Request timeout in milliseconds */
  DEFAULT_TIMEOUT: 30000,
  /** Extended timeout for batch operations */
  EXTENDED_TIMEOUT: 45000,
} as const;

/**
 * Default FIBO generation parameters
 */
export const FIBO_GENERATION = {
  /** Default aspect ratio */
  DEFAULT_ASPECT_RATIO: "16:9" as const,
  /** Default guidance scale */
  DEFAULT_GUIDANCE_SCALE: 5,
  /** Default number of steps */
  DEFAULT_STEPS: 50,
} as const;

/**
 * FIBO API endpoints
 */
export const FIBO_ENDPOINTS = {
  /** FIBO structured prompt generation endpoint */
  ANALYZE: "bria/fibo/generate/structured_prompt",
  /** FIBO image generation endpoint */
  GENERATE: "bria/fibo/generate",
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
