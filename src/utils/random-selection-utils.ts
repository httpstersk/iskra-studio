/**
 * Generic utility for randomly selecting unique items from an array.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicate items
 * are selected within a single batch.
 */

/**
 * Randomly selects unique items from an array.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicates.
 * Each selected item is guaranteed to be unique within the batch.
 *
 * @param items - Array of items to select from
 * @param count - Number of items to select
 * @returns Array of randomly selected, unique items
 *
 * @example
 * ```typescript
 * const colors = ['red', 'blue', 'green', 'yellow'];
 * const selected = selectRandomItems(colors, 2);
 * // Returns 2 unique colors, e.g., ['blue', 'yellow']
 * ```
 */
export function selectRandomItems<T>(
  items: readonly T[],
  count: number,
): T[] {
  if (count <= 0) {
    return [];
  }

  if (count >= items.length) {
    // If requesting all or more, return shuffled array
    return shuffleArray([...items]);
  }

  // Fisher-Yates shuffle to select random unique items
  const available = [...items];
  const selected: T[] = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }

  return selected;
}

/**
 * Shuffles an array using Fisher-Yates algorithm.
 *
 * @param array - Array to shuffle
 * @returns Shuffled copy of the array
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5];
 * const shuffled = shuffleArray(numbers);
 * // Returns shuffled copy, e.g., [3, 1, 5, 2, 4]
 * ```
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
