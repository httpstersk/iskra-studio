import { LIGHTING_VARIATIONS } from "@/constants/lighting-variations";
import { selectRandomItems } from "./random-selection-utils";

/**
 * Randomly selects unique lighting variations from the available set.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicate lighting scenarios
 * are selected within a single batch. Each variation is guaranteed to be unique.
 *
 * @param count - Number of variations to select
 * @returns Array of randomly selected, unique lighting variation prompts
 *
 * @example
 * ```typescript
 * // Generate 4 unique lighting variations
 * const variations = selectRandomLightingVariations(4);
 * // All 4 variations will be different lighting scenarios
 * ```
 */
export function selectRandomLightingVariations(count: number): string[] {
  return selectRandomItems(LIGHTING_VARIATIONS, count);
}
