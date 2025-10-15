/**
 * Conflict resolution for canvas state synchronization.
 * 
 * Handles cases where local and remote canvas states diverge,
 * using "last write wins" strategy based on timestamps.
 */

import type { CanvasState } from "@/types/project";

/**
 * Conflict resolution strategy.
 */
export type ConflictStrategy = "last-write-wins" | "manual";

/**
 * Conflict resolution result.
 */
interface ConflictResolution {
  /** Resolved canvas state */
  state: CanvasState;
  /** Whether a conflict was detected */
  hadConflict: boolean;
  /** Which state was chosen ("local" or "remote") */
  winner?: "local" | "remote";
}

/**
 * Resolves conflicts between local and remote canvas states.
 * 
 * Uses "last write wins" strategy based on lastModified timestamps.
 * In the future, this could be extended to support manual conflict
 * resolution with a merge dialog.
 * 
 * @param localState - Local canvas state from IndexedDB
 * @param remoteState - Remote canvas state from Convex
 * @param strategy - Conflict resolution strategy (default: "last-write-wins")
 * @returns Resolved canvas state
 * 
 * @remarks
 * Current implementation uses simple timestamp comparison.
 * Future enhancements could include:
 * - Element-level conflict detection
 * - Three-way merge using common ancestor
 * - User-facing merge dialog for manual resolution
 * - Automatic merging of non-conflicting changes
 * 
 * @example
 * ```ts
 * const resolved = resolveConflict(localState, remoteState);
 * 
 * if (resolved.hadConflict) {
 *   console.log(`Conflict resolved: ${resolved.winner} state chosen`);
 * }
 * 
 * canvasStorage.saveCanvasState(resolved.state);
 * ```
 */
export function resolveConflict(
  localState: CanvasState,
  remoteState: CanvasState,
  strategy: ConflictStrategy = "last-write-wins"
): CanvasState {
  // Check if there's actually a conflict
  const localModified = localState.lastModified || 0;
  const remoteModified = remoteState.lastModified || 0;

  // If timestamps are the same, no conflict
  if (localModified === remoteModified) {
    return {
      ...remoteState,
      syncStatus: "synced",
      isDirty: false,
    };
  }

  // Last write wins strategy
  if (strategy === "last-write-wins") {
    return resolveLastWriteWins(localState, remoteState);
  }

  // Default to remote state if strategy not recognized
  console.warn(`Unknown conflict strategy: ${strategy}, defaulting to remote state`);
  return {
    ...remoteState,
    syncStatus: "synced",
    isDirty: false,
  };
}

/**
 * Resolves conflict using "last write wins" strategy.
 * 
 * @param localState - Local canvas state
 * @param remoteState - Remote canvas state
 * @returns Resolved state with the most recent lastModified timestamp
 * 
 * @private
 */
function resolveLastWriteWins(
  localState: CanvasState,
  remoteState: CanvasState
): CanvasState {
  const localModified = localState.lastModified || 0;
  const remoteModified = remoteState.lastModified || 0;

  if (localModified > remoteModified) {
    // Local state is newer, keep it but mark as needing sync
    console.log("Conflict resolved: local state is newer");
    return {
      ...localState,
      syncStatus: "pending",
      isDirty: true,
    };
  } else {
    // Remote state is newer, use it
    console.log("Conflict resolved: remote state is newer");
    return {
      ...remoteState,
      syncStatus: "synced",
      isDirty: false,
      lastSyncedAt: Date.now(),
    };
  }
}

/**
 * Resolves conflicts with detailed result information.
 * 
 * Extended version of resolveConflict that returns additional metadata
 * about the conflict resolution process.
 * 
 * @param localState - Local canvas state
 * @param remoteState - Remote canvas state
 * @param strategy - Conflict resolution strategy
 * @returns Conflict resolution result with metadata
 * 
 * @example
 * ```ts
 * const result = resolveConflictWithMetadata(localState, remoteState);
 * 
 * if (result.hadConflict) {
 *   toast.info(`Conflict resolved: ${result.winner} changes applied`);
 * }
 * ```
 */
export function resolveConflictWithMetadata(
  localState: CanvasState,
  remoteState: CanvasState,
  strategy: ConflictStrategy = "last-write-wins"
): ConflictResolution {
  const localModified = localState.lastModified || 0;
  const remoteModified = remoteState.lastModified || 0;

  // Check if there's a conflict
  const hadConflict = localModified !== remoteModified && localState.isDirty;

  if (!hadConflict) {
    return {
      state: {
        ...remoteState,
        syncStatus: "synced",
        isDirty: false,
      },
      hadConflict: false,
    };
  }

  // Resolve based on strategy
  let winner: "local" | "remote";
  let resolvedState: CanvasState;

  if (strategy === "last-write-wins") {
    if (localModified > remoteModified) {
      winner = "local";
      resolvedState = {
        ...localState,
        syncStatus: "pending",
        isDirty: true,
      };
    } else {
      winner = "remote";
      resolvedState = {
        ...remoteState,
        syncStatus: "synced",
        isDirty: false,
        lastSyncedAt: Date.now(),
      };
    }
  } else {
    // Default to remote
    winner = "remote";
    resolvedState = {
      ...remoteState,
      syncStatus: "synced",
      isDirty: false,
    };
  }

  return {
    state: resolvedState,
    hadConflict: true,
    winner,
  };
}

/**
 * Checks if two canvas states have conflicting changes.
 * 
 * @param localState - Local canvas state
 * @param remoteState - Remote canvas state
 * @returns True if states conflict, false otherwise
 * 
 * @example
 * ```ts
 * if (hasConflict(localState, remoteState)) {
 *   const resolved = resolveConflict(localState, remoteState);
 * }
 * ```
 */
export function hasConflict(
  localState: CanvasState,
  remoteState: CanvasState
): boolean {
  const localModified = localState.lastModified || 0;
  const remoteModified = remoteState.lastModified || 0;

  return (
    localModified !== remoteModified &&
    localState.isDirty === true
  );
}

/**
 * Detects which elements have changed between two canvas states.
 * 
 * Useful for implementing more sophisticated merge strategies
 * in the future.
 * 
 * @param oldState - Original canvas state
 * @param newState - Updated canvas state
 * @returns Array of changed element IDs
 * 
 * @example
 * ```ts
 * const changedIds = detectChangedElements(oldState, newState);
 * console.log(`${changedIds.length} elements changed`);
 * ```
 */
export function detectChangedElements(
  oldState: CanvasState,
  newState: CanvasState
): string[] {
  const changedIds: string[] = [];

  // Create maps for quick lookup
  const oldElements = new Map(
    oldState.elements.map((el) => [el.id, el])
  );
  const newElements = new Map(
    newState.elements.map((el) => [el.id, el])
  );

  // Check for modified or removed elements
  for (const [id, oldEl] of oldElements) {
    const newEl = newElements.get(id);
    
    if (!newEl) {
      // Element was removed
      changedIds.push(id);
    } else if (JSON.stringify(oldEl) !== JSON.stringify(newEl)) {
      // Element was modified
      changedIds.push(id);
    }
  }

  // Check for added elements
  for (const id of newElements.keys()) {
    if (!oldElements.has(id)) {
      changedIds.push(id);
    }
  }

  return changedIds;
}
