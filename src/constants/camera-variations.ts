/**
 * Camera setting variation prompts for image generation
 * Ordered clockwise starting from top center position
 * For image mode (8): top, top-right corner, right, bottom-right corner, bottom, bottom-left corner, left, top-left corner
 * For video mode (4): uses indices 0, 2, 4, 6 (top, right, bottom, left)
 */
export const CAMERA_VARIATIONS = [
  "EXTREME LOW‑ANGLE HERO — CAMERA JUST ABOVE GROUND, TILTED UP; architecture looms while SILHOUETTE STAYS READABLE.", // 0: Top
  "OVERHEAD BIRD'S EYE VIEW — CAMERA DIRECTLY ABOVE looking down; flattens perspective and creates geometric patterns.", // 1: Top-right corner
  "PROFILE EXTREME CLOSE‑UP — NOSE‑LIP‑CHIN CONTOUR in relief; single kicker light sculpts the edge.", // 2: Right
  "CINEMATIC TELEPHOTO COMPRESSION — LONG LENS, SHALLOW DEPTH; subject isolated with beautifully blurred foreground and background.", // 3: Bottom-right corner
  "GOLDEN HOUR BACKLIGHTING — SUBJECT ILLUMINATED FROM BEHIND with warm rim lighting; creates atmospheric depth with glowing edges and soft shadows.", // 4: Bottom
  "WORM'S EYE ULTRA-WIDE — EXTREME LOW ANGLE with wide lens; dramatic distortion emphasizes height and power.", // 5: Bottom-left corner
  "WIDE-ANGLE ENVIRONMENTAL SHOT — SUBJECT IN CONTEXT with surrounding space; captures relationship between subject and environment with expansive field of view.", // 6: Left
  "DUTCH ANGLE DYNAMIC — CAMERA TILTED 25-45 DEGREES; creates tension and energy while maintaining subject clarity.", // 7: Top-left corner
] as const;
