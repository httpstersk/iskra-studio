import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { selectRandomItems } from "./random-selection-utils";

/**
 * Randomly selects unique camera variations from the available set.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicate camera angles
 * are selected within a single batch. Each variation is guaranteed to be unique.
 *
 * @param count - Number of variations to select
 * @returns Array of randomly selected, unique camera variation prompts
 *
 * @example
 * ```typescript
 * // Generate 4 unique camera variations
 * const variations = selectRandomCameraVariations(4);
 * // All 4 variations will be different camera angles
 * ```
 */
export function selectRandomCameraVariations(count: number): string[] {
  return selectRandomItems(CAMERA_VARIATIONS, count);
}
