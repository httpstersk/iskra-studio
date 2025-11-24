/**
 * Ghost placeholders constants
 * All hardcoded values used in variation ghost placeholders
 */

/**
 * Animation timing and behavior constants
 */
export const GHOST_PLACEHOLDER_ANIMATION = {
    /** Duration of badge scale animation in milliseconds */
    BADGE_SCALE_DURATION: 200,
    /** Maximum scale factor for badge */
    BADGE_SCALE_MAX: 1.3,
    /** Normal scale factor for badge */
    BADGE_SCALE_NORMAL: 1,
    /** Ease-out cubic easing function for smooth deceleration */
    EASE_OUT_CUBIC: (t: number) => 1 - Math.pow(1 - t, 3),
    /** Maximum scale factor for placeholders */
    PLACEHOLDER_SCALE_MAX: 1.0,
    /** Minimum scale factor for placeholders during animation */
    PLACEHOLDER_SCALE_MIN: 0.85,
    /** Duration of pulse effect animation in milliseconds */
    PULSE_DURATION: 400,
    /** Maximum opacity for pulse effect */
    PULSE_OPACITY_MAX: 0.4,
    /** Stagger delay between each placeholder animation in milliseconds */
    STAGGER_DELAY: 30,
    /** Total animation duration for placeholder fade-in in milliseconds */
    TOTAL_DURATION: 300,
} as const;

/**
 * Visual styling constants
 */
export const GHOST_PLACEHOLDER_STYLES = {
    /** Background color for fallback rectangle */
    FALLBACK_BACKGROUND: "rgba(15, 23, 42, 0.45)",
    /** Fill color for placeholder number text */
    NUMBER_TEXT_COLOR: "#fff",
    /** Font size for placeholder number text */
    NUMBER_TEXT_SIZE: 12,
    /** Opacity multiplier for blurred clone image */
    OPACITY_BLURRED_CLONE: 0.75,
    /** Opacity multiplier for placeholder border */
    OPACITY_BORDER: 0.25,
    /** Opacity multiplier for placeholder number text */
    OPACITY_NUMBER: 0.8,
    /** Pulse overlay color */
    PULSE_COLOR: "rgba(59, 130, 246, 0.3)",
    /** Sigma value for Gaussian blur */
    SIGMA_BLUR: 20,
    /** Border color for ghost placeholders */
    STROKE_COLOR: "white",
    /** Border width for ghost placeholders */
    STROKE_WIDTH: 1,
} as const;

/**
 * Badge positioning constants
 */
export const GHOST_PLACEHOLDER_BADGE = {
    /** Offset from anchor point for badge positioning */
    OFFSET_X: -20,
    /** Offset from anchor point for badge positioning */
    OFFSET_Y: -20,
} as const;

/**
 * Text content constants
 */
export const GHOST_PLACEHOLDER_TEXT = {
    /** Hint text displayed on reference image */
    HINT_DOUBLE_CLICK: "Double click for more variations",
    /** Font size for hint text */
    HINT_FONT_SIZE: 10,
    /** Font style for hint text */
    HINT_FONT_STYLE: "500",
    /** Text color for hint text */
    HINT_TEXT_COLOR: "#ffffff",
} as const;

/**
 * ARIA labels for accessibility
 */
export const GHOST_PLACEHOLDER_ARIA = {
    /** Main container label */
    CONTAINER: "Variation ghost placeholders",
    /** Label for hint text */
    HINT_TEXT: "Variation hint",
    /** Label template for individual placeholder */
    PLACEHOLDER: (index: number) => `Variation placeholder ${index + 1}`,
    /** Label for pulse overlay */
    PULSE_OVERLAY: "Pulse animation overlay",
} as const;

/**
 * Position indices mapping based on generation count
 * - 4 variations: cardinal directions (0, 2, 4, 6)
 * - 8 variations: all inner ring positions (0-7)
 * - 12 variations: inner ring + outer cardinal directions (0-11)
 */
export const POSITION_INDICES_MAP: Record<number, number[]> = {
    4: [0, 2, 4, 6],
    8: [0, 1, 2, 3, 4, 5, 6, 7],
    12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const;
