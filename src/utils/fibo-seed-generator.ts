/**
 * FIBO Seed Generator
 *
 * Utility for generating random seed numbers for the FIBO model.
 * Seeds are used to ensure reproducibility in image generation.
 */

/**
 * Maximum seed value for FIBO model
 */
const MAX_SEED = 9999;

/**
 * Minimum seed value for FIBO model
 */
const MIN_SEED = 1;

/**
 * Generates a random seed number for the FIBO model.
 *
 * @returns A random integer between 1 and 9,999 (inclusive)
 *
 * @example
 * ```typescript
 * const seed = generateFiboSeed();
 * // Returns a number like 4287, 8912, etc.
 * ```
 */
export function generateFiboSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED - MIN_SEED + 1)) + MIN_SEED;
}
