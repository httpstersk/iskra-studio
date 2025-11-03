/**
 * FIBO Model Constants
 *
 * Centralized configuration for Bria FIBO model parameters.
 * All FIBO-related constants should be defined here.
 */

/**
 * Default FIBO analysis parameters
 */
export const FIBO_ANALYSIS = {
  /** Default seed for reproducibility */
  DEFAULT_SEED: 666,
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
  /** Default seed for reproducibility */
  DEFAULT_SEED: 666,
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
