/**
 * Shared utilities for image variation handlers
 *
 * This is a barrel file that re-exports all variation utilities from their
 * respective modules. Provides backward compatibility for existing imports.
 *
 * For new code, prefer importing directly from:
 * - `./variation-constants` - Constants and status enums
 * - `./variation-types` - TypeScript interfaces
 * - `./variation-placeholder` - Placeholder creation functions
 * - `./variation-workflow` - Workflow, status, and error handling
 *
 * @module lib/handlers/variation-shared-utils
 */

// Re-export constants
export { VARIATION_CONSTANTS, VARIATION_STATUS } from "./variation-constants";

// Re-export types
export type {
  ApplyPixelatedOverlayConfig,
  EarlyPrepResult,
  HandleVariationErrorConfig,
  PlaceholderConfig,
  SetAnalyzingStatusConfig,
  UploadWorkflowConfig,
  UploadWorkflowResult,
  VariationBaseConfig,
  VideoPlaceholderConfig,
} from "./variation-types";

// Re-export placeholder functions
export {
  calculateBalancedPosition,
  createPlaceholder,
  createPlaceholderFactory,
  createVideoPlaceholder,
  getPositionIndices,
} from "./variation-placeholder";

// Re-export workflow functions
export {
  applyPixelatedOverlayToReferenceImage,
  handleVariationError,
  performEarlyPreparation,
  performImageUploadWorkflow,
  removeAnalyzingStatus,
  setAnalyzingStatus,
} from "./variation-workflow";
