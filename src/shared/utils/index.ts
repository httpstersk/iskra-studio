/**
 * Shared Utilities Index
 * Centralized exports for commonly used utility functions
 * Re-exports from existing utils directory for gradual migration
 *
 * Note: This is a minimal index for now. Full consolidation will happen in Phase 2.
 * For now, use direct imports from @/utils/* to avoid namespace conflicts.
 *
 * @module shared/utils
 */

// Image utilities
export {
  getOptimalImageDimensions,
} from "@/utils/image-crop-utils";

export {
  generateAndCachePixelatedOverlay,
  generatePixelatedOverlay,
} from "@/utils/image-pixelation-helper";

// Time progression
export {
  formatTimeLabel,
  getTimeProgressionSequence,
} from "@/utils/time-progression-utils";
