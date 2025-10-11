/**
 * Selection state management utilities
 * 
 * This module provides utilities for managing element selection in canvas applications,
 * including selection box calculations, multi-selection handling, and selection state
 * determination.
 * 
 * @module selection-utils
 */

import type { CanvasElement, BoundingBox } from './viewport-utils';

/**
 * Selection box representing a rectangular selection area
 */
export interface SelectionBox {
  /** Starting X position */
  x1: number;
  /** Starting Y position */
  y1: number;
  /** Ending X position */
  x2: number;
  /** Ending Y position */
  y2: number;
  /** Whether the selection box is currently active */
  visible: boolean;
}

/**
 * Creates an empty/invisible selection box.
 * 
 * @returns Empty selection box
 * 
 * @example
 * ```typescript
 * const [selectionBox, setSelectionBox] = useState(createEmptySelectionBox());
 * ```
 */
export function createEmptySelectionBox(): SelectionBox {
  return {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    visible: false,
  };
}

/**
 * Converts a selection box to a normalized bounding box with
 * left, top, right, bottom coordinates.
 * 
 * @param selectionBox - Selection box to convert
 * @returns Normalized bounding box
 * 
 * @example
 * ```typescript
 * const selectionBox = { x1: 100, y1: 200, x2: 50, y2: 150, visible: true };
 * const bounds = selectionBoxToBounds(selectionBox);
 * // bounds = { left: 50, top: 150, right: 100, bottom: 200 }
 * ```
 */
export function selectionBoxToBounds(selectionBox: SelectionBox): BoundingBox {
  return {
    left: Math.min(selectionBox.x1, selectionBox.x2),
    top: Math.min(selectionBox.y1, selectionBox.y2),
    right: Math.max(selectionBox.x1, selectionBox.x2),
    bottom: Math.max(selectionBox.y1, selectionBox.y2),
  };
}

/**
 * Checks if an element intersects with a selection box.
 * 
 * @param element - Canvas element to check
 * @param selectionBox - Selection box to check against
 * @returns True if the element intersects with the selection box
 * 
 * @example
 * ```typescript
 * const image = { x: 100, y: 100, width: 50, height: 50 };
 * const selectionBox = { x1: 80, y1: 80, x2: 120, y2: 120, visible: true };
 * const intersects = isElementInSelection(image, selectionBox); // true
 * ```
 */
export function isElementInSelection(
  element: CanvasElement,
  selectionBox: SelectionBox
): boolean {
  if (!selectionBox.visible) {
    return false;
  }

  const bounds = selectionBoxToBounds(selectionBox);

  return !(
    element.x + element.width < bounds.left ||
    element.x > bounds.right ||
    element.y + element.height < bounds.top ||
    element.y > bounds.bottom
  );
}

/**
 * Finds all elements within a selection box.
 * 
 * @param elements - Array of canvas elements to check
 * @param selectionBox - Selection box to check against
 * @returns Array of element IDs that intersect with the selection box
 * 
 * @example
 * ```typescript
 * const images = [
 *   { id: '1', x: 100, y: 100, width: 50, height: 50 },
 *   { id: '2', x: 200, y: 200, width: 50, height: 50 }
 * ];
 * const selectionBox = { x1: 80, y1: 80, x2: 130, y2: 130, visible: true };
 * const selectedIds = getElementsInSelection(images, selectionBox); // ['1']
 * ```
 */
export function getElementsInSelection<T extends CanvasElement & { id: string }>(
  elements: T[],
  selectionBox: SelectionBox
): string[] {
  if (!selectionBox.visible) {
    return [];
  }

  return elements
    .filter((element) => isElementInSelection(element, selectionBox))
    .map((element) => element.id);
}

/**
 * Checks if a point is within an element's bounds.
 * 
 * @param pointX - X coordinate of the point
 * @param pointY - Y coordinate of the point
 * @param element - Canvas element to check
 * @returns True if the point is within the element
 * 
 * @example
 * ```typescript
 * const element = { x: 100, y: 100, width: 50, height: 50 };
 * const isInside = isPointInElement(120, 130, element); // true
 * ```
 */
export function isPointInElement(
  pointX: number,
  pointY: number,
  element: CanvasElement
): boolean {
  return (
    pointX >= element.x &&
    pointX <= element.x + element.width &&
    pointY >= element.y &&
    pointY <= element.y + element.height
  );
}

/**
 * Finds the topmost element at a given point (in reverse render order).
 * Elements later in the array are considered "on top".
 * 
 * @param pointX - X coordinate to check
 * @param pointY - Y coordinate to check
 * @param elements - Array of canvas elements (in render order)
 * @returns The topmost element at the point, or null if none found
 * 
 * @example
 * ```typescript
 * const elements = [
 *   { id: '1', x: 100, y: 100, width: 100, height: 100 },
 *   { id: '2', x: 110, y: 110, width: 50, height: 50 }
 * ];
 * const element = getElementAtPoint(120, 120, elements); // Returns element '2'
 * ```
 */
export function getElementAtPoint<T extends CanvasElement>(
  pointX: number,
  pointY: number,
  elements: T[]
): T | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (isPointInElement(pointX, pointY, element)) {
      return element;
    }
  }
  return null;
}

/**
 * Toggles selection of an element (adds if not selected, removes if selected).
 * 
 * @param elementId - ID of the element to toggle
 * @param currentSelection - Current array of selected IDs
 * @returns New selection array
 * 
 * @example
 * ```typescript
 * const selected = ['id1', 'id2'];
 * const newSelection = toggleSelection('id2', selected); // ['id1']
 * const newSelection2 = toggleSelection('id3', selected); // ['id1', 'id2', 'id3']
 * ```
 */
export function toggleSelection(
  elementId: string,
  currentSelection: string[]
): string[] {
  if (currentSelection.includes(elementId)) {
    return currentSelection.filter((id) => id !== elementId);
  }
  return [...currentSelection, elementId];
}

/**
 * Adds elements to selection without duplicates.
 * 
 * @param elementIds - IDs to add to selection
 * @param currentSelection - Current array of selected IDs
 * @returns New selection array
 * 
 * @example
 * ```typescript
 * const selected = ['id1', 'id2'];
 * const newSelection = addToSelection(['id2', 'id3'], selected); // ['id1', 'id2', 'id3']
 * ```
 */
export function addToSelection(
  elementIds: string[],
  currentSelection: string[]
): string[] {
  const uniqueIds = new Set([...currentSelection, ...elementIds]);
  return Array.from(uniqueIds);
}

/**
 * Removes elements from selection.
 * 
 * @param elementIds - IDs to remove from selection
 * @param currentSelection - Current array of selected IDs
 * @returns New selection array
 * 
 * @example
 * ```typescript
 * const selected = ['id1', 'id2', 'id3'];
 * const newSelection = removeFromSelection(['id2'], selected); // ['id1', 'id3']
 * ```
 */
export function removeFromSelection(
  elementIds: string[],
  currentSelection: string[]
): string[] {
  const idsToRemove = new Set(elementIds);
  return currentSelection.filter((id) => !idsToRemove.has(id));
}

/**
 * Handles click selection with modifier key support.
 * 
 * @param elementId - ID of the clicked element (null for background click)
 * @param currentSelection - Current array of selected IDs
 * @param isMultiSelectKey - Whether Cmd/Ctrl key is pressed
 * @param isShiftKey - Whether Shift key is pressed
 * @returns New selection array
 * 
 * @example
 * ```typescript
 * const selected = ['id1'];
 * // Click id2 with Cmd/Ctrl
 * const newSelection = handleClickSelection('id2', selected, true, false);
 * // Result: ['id1', 'id2']
 * ```
 */
export function handleClickSelection(
  elementId: string | null,
  currentSelection: string[],
  isMultiSelectKey: boolean,
  isShiftKey: boolean
): string[] {
  if (elementId === null) {
    return [];
  }

  if (isMultiSelectKey || isShiftKey) {
    return toggleSelection(elementId, currentSelection);
  }

  if (currentSelection.includes(elementId) && currentSelection.length === 1) {
    return currentSelection;
  }

  return [elementId];
}

/**
 * Filters elements to only those that are currently selected.
 * 
 * @param elements - Array of elements with IDs
 * @param selectedIds - Array of selected IDs
 * @returns Array of selected elements
 * 
 * @example
 * ```typescript
 * const allImages = [
 *   { id: 'id1', x: 0, y: 0, width: 50, height: 50 },
 *   { id: 'id2', x: 100, y: 100, width: 50, height: 50 }
 * ];
 * const selectedImages = getSelectedElements(allImages, ['id1']); // [first image]
 * ```
 */
export function getSelectedElements<T extends { id: string }>(
  elements: T[],
  selectedIds: string[]
): T[] {
  const idSet = new Set(selectedIds);
  return elements.filter((element) => idSet.has(element.id));
}

/**
 * Gets IDs of all elements.
 * 
 * @param elements - Array of elements with IDs
 * @returns Array of all element IDs
 * 
 * @example
 * ```typescript
 * const elements = [{ id: 'id1', ... }, { id: 'id2', ... }];
 * const allIds = getAllElementIds(elements); // ['id1', 'id2']
 * ```
 */
export function getAllElementIds<T extends { id: string }>(elements: T[]): string[] {
  return elements.map((element) => element.id);
}

/**
 * Checks if an element is currently selected.
 * 
 * @param elementId - ID of the element to check
 * @param selectedIds - Array of selected IDs
 * @returns True if the element is selected
 * 
 * @example
 * ```typescript
 * const isSelected = isElementSelected('id1', ['id1', 'id2']); // true
 * ```
 */
export function isElementSelected(
  elementId: string,
  selectedIds: string[]
): boolean {
  return selectedIds.includes(elementId);
}
