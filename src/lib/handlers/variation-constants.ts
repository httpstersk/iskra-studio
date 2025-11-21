/**
 * Constants for variation generation
 *
 * @module lib/handlers/variation-constants
 */

/**
 * Position arrays for variation placement around source image
 */
export const VARIATION_CONSTANTS = {
  /** Positions for 4 variations (cardinal directions) */
  FOUR_VARIATION_POSITIONS: [0, 2, 4, 6] as number[],
  /** Positions for 8 variations (all 8 positions) */
  EIGHT_VARIATION_POSITIONS: [0, 1, 2, 3, 4, 5, 6, 7] as number[],
  /** Positions for 12 variations (inner ring + outer cardinal) */
  TWELVE_VARIATION_POSITIONS: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ] as number[],
};

/**
 * Status messages for variation generation stages
 */
export const VARIATION_STATUS = {
  ANALYZING: "analyzing",
  CREATING_STORYLINE: "creating-storyline",
  GENERATING: "generating",
  UPLOADING: "uploading",
} as const;
