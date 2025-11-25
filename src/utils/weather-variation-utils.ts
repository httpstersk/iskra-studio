import { WEATHER_VARIATIONS } from "@/constants/weather-variations";
import { selectRandomItems } from "./random-selection-utils";

/**
 * Randomly selects unique weather variations from the available set.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicate weather conditions
 * are selected within a single batch. Each variation is guaranteed to be unique.
 *
 * @param count - Number of variations to select
 * @returns Array of randomly selected, unique weather variation prompts
 *
 * @example
 * ```typescript
 * // Generate 4 unique weather variations
 * const variations = selectRandomWeatherVariations(4);
 * // All 4 variations will be different weather conditions
 * ```
 */
export function selectRandomWeatherVariations(count: number): string[] {
  return selectRandomItems(WEATHER_VARIATIONS, count);
}
