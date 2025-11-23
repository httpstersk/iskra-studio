import { EMOTION_VARIATIONS } from "@/constants/emotion-variations";
import { selectRandomItems } from "./random-selection-utils";

/**
 * Randomly selects unique emotion variations from the available set.
 *
 * Uses Fisher-Yates shuffle algorithm to ensure no duplicate emotions
 * are selected within a single batch. Each variation is guaranteed to be unique.
 *
 * @param count - Number of variations to select
 * @returns Array of randomly selected, unique emotion variation prompts
 */
export function selectRandomEmotionVariations(count: number): string[] {
    return selectRandomItems(EMOTION_VARIATIONS, count);
}
