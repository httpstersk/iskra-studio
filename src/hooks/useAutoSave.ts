/**
 * Auto-save hook for projects.
 * 
 * Automatically saves canvas state changes to Convex with debouncing.
 * Only saves when not currently generating and when changes are detected.
 */

"use client";

import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useProjects } from "./useProjects";
import {
  activeGenerationsAtom,
  activeVideoGenerationsAtom,
} from "@/store/generation-atoms";
import {
  canvasDirtyAtom,
  currentProjectAtom,
} from "@/store/project-atoms";
import type { CanvasState } from "@/lib/storage";
import { debounce } from "@/utils/performance";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Auto-save configuration options.
 */
interface UseAutoSaveOptions {
  /** Debounce delay in milliseconds (default: 10000 = 10 seconds) */
  debounceMs?: number;
  
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  
  /** Function to generate thumbnail (optional) */
  generateThumbnail?: () => Promise<string | undefined>;
}

/**
 * Return type for the useAutoSave hook.
 */
interface UseAutoSaveReturn {
  /** Whether auto-save is currently enabled */
  isEnabled: boolean;
  
  /** Whether a save is currently in progress */
  isSaving: boolean;
  
  /** Timestamp of last successful save */
  lastSavedAt: number | null;
  
  /** Manually triggers a save */
  triggerSave: () => Promise<void>;
}

/**
 * Auto-save hook for project canvas state.
 * 
 * Automatically saves canvas changes to Convex after a debounce delay.
 * Skips saving when:
 * - No project is loaded
 * - Canvas has no unsaved changes
 * - AI generation is in progress (images or videos)
 * - A save is already in progress
 * 
 * @param canvasState - Current canvas state to save
 * @param options - Auto-save configuration options
 * 
 * @remarks
 * - Default debounce: 10 seconds
 * - Generates thumbnail if generateThumbnail function provided
 * - Shows toast notifications on save errors
 * - Updates lastSavedAt atom on successful save
 * 
 * @example
 * ```tsx
 * function CanvasEditor() {
 *   const [canvasState, setCanvasState] = useState<CanvasState>(...);
 *   
 *   const { isSaving, triggerSave } = useAutoSave(canvasState, {
 *     debounceMs: 10000,
 *     generateThumbnail: async () => {
 *       return await generateThumbnail(stageRef.current);
 *     },
 *   });
 *   
 *   return (
 *     <div>
 *       {isSaving && <span>Saving...</span>}
 *       <button onClick={triggerSave}>Save Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoSave(
  canvasState: CanvasState | null,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    debounceMs = 10000, // 10 seconds default
    enabled = true,
    generateThumbnail,
  } = options;

  // Hooks
  const { saveProject, isSaving, lastSavedAt, currentProject } = useProjects();
  const { toast } = useToast();

  // Atoms
  const isDirty = useAtomValue(canvasDirtyAtom);
  const activeGenerations = useAtomValue(activeGenerationsAtom);
  const activeVideoGenerations = useAtomValue(activeVideoGenerationsAtom);
  const currentProjectState = useAtomValue(currentProjectAtom);

  // Refs
  const lastSavedStateRef = useRef<string | null>(null);

  /**
   * Checks if conditions are met for auto-save.
   */
  const canAutoSave = useCallback((): boolean => {
    // Don't save if disabled
    if (!enabled) return false;

    // Don't save if no project loaded
    if (!currentProjectState) return false;

    // Don't save if no canvas state
    if (!canvasState) return false;

    // Don't save if canvas not dirty
    if (!isDirty) return false;

    // Don't save if already saving
    if (isSaving) return false;

    // Don't save if any generation is in progress
    if (activeGenerations.size > 0 || activeVideoGenerations.size > 0) {
      return false;
    }

    // Check if state actually changed (compare JSON)
    const currentStateJson = JSON.stringify(canvasState);
    if (currentStateJson === lastSavedStateRef.current) {
      return false;
    }

    return true;
  }, [
    enabled,
    currentProjectState,
    canvasState,
    isDirty,
    isSaving,
    activeGenerations,
    activeVideoGenerations,
  ]);

  /**
   * Performs the save operation.
   */
  const performSave = useCallback(async () => {
    if (!currentProjectState || !canvasState) {
      return;
    }

    try {
      // Generate thumbnail if function provided
      let thumbnailStorageId: string | undefined;
      if (generateThumbnail) {
        try {
          thumbnailStorageId = await generateThumbnail();
        } catch (error) {
          console.warn("Failed to generate thumbnail:", error);
          // Continue with save even if thumbnail fails
        }
      }

      // Save project
      await saveProject(
        currentProjectState._id as Id<"projects">,
        canvasState,
        thumbnailStorageId
      );

      // Update last saved state ref
      lastSavedStateRef.current = JSON.stringify(canvasState);
    } catch (error) {
      console.error("Auto-save failed:", error);
      
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive",
      });
    }
  }, [currentProjectState, canvasState, generateThumbnail, saveProject, toast]);

  /**
   * Debounced save function.
   */
  const debouncedSave = useRef(
    debounce(performSave, debounceMs)
  );

  /**
   * Updates debounced function when delay changes.
   */
  useEffect(() => {
    debouncedSave.current = debounce(performSave, debounceMs);
  }, [performSave, debounceMs]);

  /**
   * Triggers auto-save when conditions are met.
   */
  useEffect(() => {
    if (canAutoSave()) {
      debouncedSave.current();
    }
  }, [canvasState, canAutoSave]);

  /**
   * Manually triggers an immediate save.
   */
  const triggerSave = useCallback(async () => {
    if (!currentProjectState || !canvasState) {
      toast({
        title: "Nothing to save",
        description: "No project is currently loaded",
        variant: "default",
      });
      return;
    }

    if (isSaving) {
      toast({
        title: "Save in progress",
        description: "Please wait for current save to complete",
        variant: "default",
      });
      return;
    }

    await performSave();
  }, [currentProjectState, canvasState, isSaving, performSave, toast]);

  return {
    isEnabled: enabled,
    isSaving,
    lastSavedAt,
    triggerSave,
  };
}
