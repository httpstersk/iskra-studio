/**
 * Project loading and saving with asset synchronization.
 *
 * High-level operations that integrate asset validation with project I/O.
 */

import type { CanvasState } from "@/types/project";
import type { Asset } from "@/types/asset";
import {
  validateCanvasState,
  syncElementWithAsset,
  orphanElement,
  generateMigrationPlan,
} from "./asset-synchronizer";
import { mergeToElements, separateElements } from "./element-converter";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * Options for loading a project with asset validation.
 */
/**
 * Options for loading a project with asset validation.
 */
export interface LoadProjectOptions {
  /** Whether to auto-fix detected issues (sync metadata, orphan elements) */
  autoFix?: boolean;

  /** Whether to delete elements with orphaned assets */
  deleteOrphaned?: boolean;

  /** Callback when issues detected */
  onIssuesDetected?: (issues: { orphaned: string[]; stale: string[] }) => void;
}

/**
 * Options for saving a project with asset validation.
 */
/**
 * Options for saving a project with asset validation.
 */
export interface SaveProjectOptions {
  /** Callback if validation fails */
  onValidationError?: (error: string) => void;

  /** Whether to validate before saving */
  validate?: boolean;
}

/**
 * Result of loading a project with asset validation.
 */
/**
 * Result of loading a project with asset validation.
 */
export interface LoadProjectResult {
  canvasState: CanvasState;
  images: PlacedImage[];
  issues: {
    orphanedElements: string[];
    staleMetadataElements: string[];
  };
  videos: PlacedVideo[];
  warnings: string[];
}

/**
 * Loads a project with full asset validation and synchronization.
 *
 * High-level operation that:
 * 1. Validates all asset references
 * 2. Detects orphaned/stale elements
 * 3. Auto-fixes issues if requested
 * 4. Loads assets and URLs
 * 5. Converts to runtime format
 *
 * @param canvasState - Raw canvas state from database
 * @param assets - User's asset records
 * @param assetUrls - Map of asset ID to public URL
 * @param userId - User ID for validation
 * @param options - Load options
 * @returns Loaded project with issues and warnings
 *
 * @example
 * ```ts
 * // Load project from database
 * const project = await getProject(projectId);
 * const assets = await listAssets();
 * const assetUrls = await generateAssetUrls(assets);
 *
 * const result = await loadProjectWithAssets(
 *   project.canvasState,
 *   assets,
 *   assetUrls,
 *   userId,
 *   { autoFix: true, deleteOrphaned: false }
 * );
 *
 * if (result.issues.orphanedElements.length > 0) {
 *   toast.warning(`${result.issues.orphanedElements.length} elements have missing assets`);
 * }
 *
 * setCanvasState(result.canvasState);
 * setImages(result.images);
 * setVideos(result.videos);
 * ```
 */
export async function loadProjectWithAssets(
  canvasState: CanvasState,
  assets: Asset[],
  assetUrls: Map<string, string>,
  userId: string,
  options: LoadProjectOptions = {},
): Promise<LoadProjectResult> {
  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const warnings: string[] = [];

  // 1. Validate all assets
  const validation = validateCanvasState(canvasState, assetMap, userId);

  if (!validation.isValid) {
    const issues = {
      orphanedElements: validation.invalidElements.map((e) => e.elementId),
      staleMetadataElements: validation.staleMetadata.map((e) => e.elementId),
    };

    // Auto-fix if requested
    if (options.autoFix) {
      const fixedElements = [...canvasState.elements];

      // Sync stale metadata
      for (const stale of validation.staleMetadata) {
        const asset = assetMap.get(stale.elementId);
        if (asset) {
          const index = fixedElements.findIndex(
            (e) => e.id === stale.elementId,
          );
          if (index >= 0) {
            fixedElements[index] = syncElementWithAsset(
              fixedElements[index],
              asset,
            );
          }
        }
      }

      // Orphan invalid elements
      for (const invalid of validation.invalidElements) {
        const index = fixedElements.findIndex(
          (e) => e.id === invalid.elementId,
        );
        if (index >= 0) {
          if (options.deleteOrphaned) {
            fixedElements.splice(index, 1);
          } else {
            fixedElements[index] = orphanElement(fixedElements[index]);
          }
        }
      }

      canvasState = {
        ...canvasState,
        elements: fixedElements,
      };

      if (validation.invalidElements.length > 0) {
        warnings.push(
          `${validation.invalidElements.length} elements have missing assets and were orphaned`,
        );
      }

      if (validation.staleMetadata.length > 0) {
        warnings.push(
          `${validation.staleMetadata.length} elements had metadata refreshed`,
        );
      }
    }

    options.onIssuesDetected?.({
      orphaned: issues.orphanedElements,
      stale: issues.staleMetadataElements,
    });
  }

  // 2. Convert to runtime format
  const { images, videos } = separateElements(canvasState.elements, assetUrls);

  return {
    canvasState,
    images,
    videos,
    issues: {
      orphanedElements: validation.invalidElements.map((e) => e.elementId),
      staleMetadataElements: validation.staleMetadata.map((e) => e.elementId),
    },
    warnings,
  };
}

/**
 * Saves a project with asset validation and conversion.
 *
 * High-level operation that:
 * 1. Converts runtime format to persistence format
 * 2. Validates asset references
 * 3. Saves to database
 *
 * @param images - PlacedImage array
 * @param videos - PlacedVideo array
 * @param canvasState - Additional canvas state (viewport, etc.)
 * @param assets - User's asset records
 * @param userId - User ID for validation
 * @param options - Save options
 * @returns Validation status
 *
 * @example
 * ```ts
 * const saveResult = await saveProjectWithAssets(
 *   canvasState.images,
 *   canvasState.videos,
 *   canvasState,
 *   assets,
 *   userId,
 *   { validate: true }
 * );
 *
 * if (!saveResult.isValid) {
 *   return;
 * }
 * ```
 */
export function prepareProjectForSave(
  images: PlacedImage[],
  videos: PlacedVideo[],
  canvasState: CanvasState,
  assets: Asset[],
  userId: string,
  options: SaveProjectOptions = {},
) {
  // Convert to persistence format
  const elements = mergeToElements(images, videos);

  // Validate if requested
  if (options.validate) {
    const assetMap = new Map(assets.map((a) => [a.id, a]));
    const validation = validateCanvasState(
      { ...canvasState, elements },
      assetMap,
      userId,
    );

    if (!validation.isValid) {
      const plan = generateMigrationPlan(validation);
      options.onValidationError?.(
        `Validation failed: ${plan.elementsToDelete.length} orphaned, ${plan.elementsToSync.length} stale`,
      );

      return {
        isValid: false,
        elements,
        issues: {
          orphaned: plan.elementsToDelete,
          stale: plan.elementsToSync.map((e) => e.elementId),
        },
      };
    }
  }

  return {
    isValid: true,
    elements,
    issues: {
      orphaned: [],
      stale: [],
    },
  };
}

/**
 * Detects which elements would become orphaned if an asset is deleted.
 *
 * @param canvasState - Canvas state
 * @param assetId - Asset ID to check
 * @returns Count of elements that would be orphaned
 *
 * @example
 * ```ts
 * const count = countElementsUsingAsset(project.canvasState, assetToDelete);
 * if (count > 0) {
 *   showConfirm(
 *     `Delete this asset? ${count} elements in projects would become orphaned.`
 *   );
 * }
 * ```
 */
export function countElementsUsingAsset(
  canvasState: CanvasState,
  assetId: string,
): number {
  return canvasState.elements.filter((e) => e.assetId === assetId).length;
}
