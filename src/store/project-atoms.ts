/**
 * Jotai atoms for project state management.
 * 
 * Manages current project, project list, auto-save state, and loading indicators.
 * 
 * @remarks
 * - currentProjectAtom stores the active project ID and metadata
 * - projectListAtom contains all user's projects
 * - Auto-save related atoms track save state and timestamps
 */

import { atom } from "jotai";
import type { Project, ProjectMetadata } from "@/types/project";

/**
 * Current active project atom.
 * 
 * Stores the currently loaded project with full canvas state.
 * Null when no project is loaded (e.g., new unsaved canvas).
 * 
 * @remarks
 * Updated when user:
 * - Creates a new project
 * - Opens an existing project
 * - Closes/exits a project
 */
export const currentProjectAtom = atom<Project | null>(null);

/**
 * Project list atom containing all user's projects.
 * 
 * Stores lightweight project metadata for displaying in the project list UI.
 * Does not include full canvas state to minimize memory usage.
 * 
 * @remarks
 * - Updated when projects are created, renamed, or deleted
 * - Initially empty until first fetch
 * - Sorted by lastSavedAt (most recent first)
 */
export const projectListAtom = atom<ProjectMetadata[]>([]);

/**
 * Auto-save in progress indicator.
 * 
 * True when canvas changes are being saved to Convex.
 * Used to show "Saving..." indicator in UI.
 * 
 * @remarks
 * Set to true when:
 * - Auto-save debounce triggers
 * - User manually triggers save
 * 
 * Set to false when:
 * - Save completes successfully
 * - Save fails with error
 */
export const isAutoSavingAtom = atom<boolean>(false);

/**
 * Last successful save timestamp.
 * 
 * Timestamp in milliseconds since epoch of the last successful project save.
 * Null if project has never been saved.
 * 
 * @remarks
 * Used to display "Saved at [time]" in the UI.
 * Updated after successful auto-save or manual save.
 */
export const lastSavedAtAtom = atom<number | null>(null);

/**
 * Project loading state indicator.
 * 
 * True when loading a project from Convex (e.g., opening from project list).
 * Used to show loading spinner during project load.
 * 
 * @remarks
 * Set to true when:
 * - User clicks on a project to open it
 * - App loads project from URL parameter
 * 
 * Set to false when:
 * - Project loads successfully
 * - Project load fails with error
 */
export const projectLoadingAtom = atom<boolean>(false);

/**
 * Canvas dirty state indicator.
 * 
 * True when canvas has unsaved changes that need to be synced to Convex.
 * Used by auto-save to determine if save is needed.
 * 
 * @remarks
 * Set to true when:
 * - User makes changes to canvas (add/move/delete elements)
 * - Canvas state is modified
 * 
 * Set to false when:
 * - Changes are successfully saved
 * - Project is loaded (fresh state)
 */
export const canvasDirtyAtom = atom<boolean>(false);

/**
 * Auto-save error message.
 * 
 * Error message from the last failed save attempt, or null if no error.
 * Used to display error state in auto-save indicator.
 * 
 * @remarks
 * Set when:
 * - Save operation fails with error
 * 
 * Cleared when:
 * - Next save attempt starts
 * - Save succeeds
 */
export const autoSaveErrorAtom = atom<string | null>(null);

/**
 * Derived atom for current project ID.
 * 
 * Returns the ID of the current project, or null if no project is loaded.
 * 
 * @remarks
 * Read-only derived atom for convenience.
 * Use currentProjectAtom to update the project.
 */
export const currentProjectIdAtom = atom<string | null>(
  (get) => get(currentProjectAtom)?._id || null
);

/**
 * Optimistic project ID base atom (private).
 * 
 * Stores the project ID immediately when switching starts, before async load completes.
 * This provides instant UI feedback without waiting for Convex queries.
 * 
 * @private
 */
const optimisticProjectIdBaseAtom = atom<string | null>(null);

/**
 * Optimistic project ID atom for immediate UI updates.
 * 
 * Returns the optimistic project ID if set (during switching),
 * otherwise falls back to the real current project ID.
 * 
 * This enables instant sidebar indicator updates when switching projects,
 * eliminating the lag caused by waiting for async project loads.
 * 
 * @remarks
 * - Write to this atom when starting a project switch (synchronous)
 * - Automatically cleared when real project loads
 * - Falls back to real ID when no optimistic update is pending
 * 
 * @example
 * ```tsx
 * // Set optimistic ID immediately on click
 * setOptimisticProjectId(newProjectId);
 * 
 * // Load project asynchronously
 * await loadProject(newProjectId);
 * 
 * // Clear optimistic state after load completes
 * setOptimisticProjectId(null);
 * ```
 */
export const optimisticProjectIdAtom = atom(
  (get) => {
    const optimistic = get(optimisticProjectIdBaseAtom);
    if (optimistic) return optimistic;
    return get(currentProjectIdAtom);
  },
  (_get, set, newId: string | null) => {
    set(optimisticProjectIdBaseAtom, newId);
  }
);

/**
 * Derived atom for current project name.
 * 
 * Returns the name of the current project, or "Untitled Project" if no project is loaded.
 * 
 * @remarks
 * Read-only derived atom for display purposes.
 */
export const currentProjectNameAtom = atom<string>(
  (get) => get(currentProjectAtom)?.name || "Untitled Project"
);
