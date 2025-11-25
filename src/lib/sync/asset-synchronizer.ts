/**
 * Asset synchronization and validation for project elements.
 *
 * Ensures that element references to assets remain valid and synchronized,
 * detecting orphaned references and stale asset metadata.
 */

import type { CanvasElement, CanvasState } from "@/types/project";
import type { Asset } from "@/types/asset";

/**
 * Result of asset validation for an element.
 */
/**
 * Result of asset validation for an element.
 */
export interface AssetValidationResult {
  /** Asset record if found (from Convex) */
  asset?: Asset;

  /** Element ID */
  elementId: string;

  /** Error message if validation failed */
  error?: string;

  /** Whether the element has a valid asset reference */
  hasValidAsset: boolean;

  /** Whether asset metadata differs from element */
  metadataDiffers?: boolean;
}

/**
 * Result of canvas state validation.
 */
/**
 * Result of canvas state validation.
 */
export interface CanvasStateValidationResult {
  /** Elements with invalid/orphaned assets */
  invalidElements: AssetValidationResult[];

  /** Whether all elements are valid */
  isValid: boolean;

  /** Elements with stale metadata (asset differs from element) */
  staleMetadata: AssetValidationResult[];

  /** Total number of elements checked */
  totalElements: number;

  /** Elements with valid assets */
  validElements: number;
}

/**
 * Validates whether an element has a valid asset reference.
 *
 * Checks:
 * - Asset exists in database
 * - User owns the asset
 * - Asset type matches element type (if both specified)
 * - Metadata is current (optional)
 *
 * @param element - Canvas element to validate
 * @param assetMap - Map of asset ID to asset record (from Convex)
 * @param userId - User ID for ownership verification
 * @returns Validation result with asset data if found
 *
 * @example
 * ```ts
 * const element = canvasState.elements[0];
 * const result = validateElementAsset(element, assetsMap, userId);
 * ```
 */
export function validateElementAsset(
  element: CanvasElement,
  assetMap: Map<string, Asset>,
  userId: string,
): AssetValidationResult {
  const result: AssetValidationResult = {
    elementId: element.id,
    hasValidAsset: false,
  };

  // No asset reference - valid for text/shape elements
  if (!element.assetId) {
    if (element.type === "image" || element.type === "video") {
      result.error = `Media element missing assetId reference`;
    }
    return result;
  }

  // Try to find asset
  const asset = assetMap.get(element.assetId);
  if (!asset) {
    result.error = `Asset ${element.assetId} not found`;
    return result;
  }

  // Verify ownership
  if (asset.userId !== userId) {
    result.error = `User does not own asset ${element.assetId}`;
    return result;
  }

  // Verify type matches (if both specified)
  if (element.assetType && asset.type !== element.assetType) {
    result.error = `Asset type mismatch: element has ${element.assetType}, asset is ${asset.type}`;
    return result;
  }

  // Check if metadata differs significantly
  const metadataDiffers = !!(
    (element.width && asset.width && element.width !== asset.width) ||
    (element.height && asset.height && element.height !== asset.height) ||
    (element.duration && asset.duration && element.duration !== asset.duration)
  );

  result.asset = asset;
  result.hasValidAsset = true;
  result.metadataDiffers = metadataDiffers;

  return result;
}

/**
 * Validates all elements in a canvas state.
 *
 * Performs batch validation of all elements against available assets,
 * collecting validation results for invalid and stale metadata elements.
 *
 * @param canvasState - Complete canvas state
 * @param assetMap - Map of asset ID to asset record
 * @param userId - User ID for validation
 * @returns Comprehensive validation result with statistics
 *
 * @example
 * ```ts
 * const assets = await loadUserAssets(userId);
 * const assetMap = new Map(assets.map(a => [a.id, a]));
 *
 * const result = validateCanvasState(project.canvasState, assetMap, userId);
 *
 * if (result.invalidElements.length > 0) {
 *   console.warn("Orphaned assets found:", result.invalidElements);
 * }
 * ```
 */
export function validateCanvasState(
  canvasState: CanvasState,
  assetMap: Map<string, Asset>,
  userId: string,
): CanvasStateValidationResult {
  const invalidElements: AssetValidationResult[] = [];
  const staleMetadata: AssetValidationResult[] = [];
  let validElements = 0;

  for (const element of canvasState.elements) {
    const validation = validateElementAsset(element, assetMap, userId);

    if (validation.hasValidAsset) {
      validElements++;
      if (validation.metadataDiffers) {
        staleMetadata.push(validation);
      }
    } else {
      invalidElements.push(validation);
    }
  }

  return {
    isValid: invalidElements.length === 0 && staleMetadata.length === 0,
    totalElements: canvasState.elements.length,
    validElements,
    invalidElements,
    staleMetadata,
  };
}

/**
 * Updates element to synchronize with current asset metadata.
 *
 * Refreshes cached asset metadata in the element (dimensions, duration)
 * to match the current asset state. Element dimensions can differ
 * from asset if the user has resized it.
 *
 * @param element - Element to update
 * @param asset - Asset with current metadata
 * @returns Updated element
 *
 * @example
 * ```ts
 * const updated = syncElementWithAsset(element, latestAsset);
 * elements[index] = updated;
 * ```
 */
export function syncElementWithAsset(
  element: CanvasElement,
  asset: Asset,
): CanvasElement {
  return {
    ...element,
    assetId: asset.id,
    assetType: asset.type,
    assetSyncedAt: Date.now(),
    // Don't override element dimensions - user may have resized
    // But update if element has no dimensions yet
    width: element.width || asset.width,
    height: element.height || asset.height,
    duration: element.duration || asset.duration,
  };
}

/**
 * Removes asset references from orphaned elements.
 *
 * Clears assetId for elements that no longer have valid assets,
 * allowing them to be treated as local-only elements or deleted.
 *
 * @param element - Element to orphan
 * @returns Element without asset reference
 *
 * @example
 * ```ts
 * if (result.invalidElements.length > 0) {
 *   elements = elements.map(el =>
 *     result.invalidElements.some(inv => inv.elementId === el.id)
 *       ? orphanElement(el)
 *       : el
 *   );
 * }
 * ```
 */
export function orphanElement(element: CanvasElement): CanvasElement {
  const {
    assetId: _assetId,
    assetType: _assetType,
    assetSyncedAt: _assetSyncedAt,
    ...rest
  } = element;
  return rest;
}

/**
 * Generates a migration plan to fix invalid elements.
 *
 * Analyzes validation results and suggests actions:
 * - Delete elements with orphaned assets
 * - Update elements with stale metadata
 * - Flag elements that need user attention
 *
 * @param validation - Validation result from validateCanvasState
 * @returns Migration plan with actions
 *
 */
/**
 * Migration plan to fix invalid elements.
 */
export interface MigrationPlan {
  /** Element IDs to delete (orphaned assets) */
  elementsToDelete: string[];

  /** Elements needing metadata refresh */
  elementsToSync: Array<{
    assetId: string;
    elementId: string;
    reason: string;
  }>;

  /** Whether manual intervention needed */
  needsUserAttention: boolean;
}

export function generateMigrationPlan(
  validation: CanvasStateValidationResult,
): MigrationPlan {
  return {
    elementsToDelete: validation.invalidElements.map((e) => e.elementId),
    elementsToSync: validation.staleMetadata.map((e) => ({
      elementId: e.elementId,
      assetId: e.asset!.id,
      reason: "Asset metadata updated since element creation",
    })),
    needsUserAttention: validation.invalidElements.length > 0,
  };
}
