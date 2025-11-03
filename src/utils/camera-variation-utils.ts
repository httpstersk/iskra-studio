import { CAMERA_VARIATIONS } from "@/constants/camera-variations";

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
  if (count <= 0) {
    return [];
  }

  if (count >= CAMERA_VARIATIONS.length) {
    // If requesting all or more, return shuffled array
    return shuffleArray([...CAMERA_VARIATIONS]);
  }

  // Fisher-Yates shuffle to select random unique items
  const available = [...CAMERA_VARIATIONS];
  const selected: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  return selected;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns Shuffled copy of the array
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
