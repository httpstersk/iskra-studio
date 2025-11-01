/**
 * ProjectPanelWrapper component - Memoized wrapper for ProjectPanel
 *
 * Prevents unnecessary rerenders by memoizing the component and its callbacks.
 *
 * @module components/canvas/ProjectPanelWrapper
 */

"use client";

import { ProjectPanel } from "@/components/projects/project-panel";
import { optimisticProjectIdAtom } from "@/store/project-atoms";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";

/**
 * Props for the ProjectPanelWrapper component
 */
interface ProjectPanelWrapperProps {
  currentProjectId: string | undefined;
  isOpen: boolean;
  loadProject: (projectId: any) => Promise<void>;
  onToggle: () => void;
  restoreLastGoodState: () => void;
}

/**
 * Memoized wrapper for ProjectPanel with stable callbacks.
 *
 * @component
 */
export const ProjectPanelWrapper = React.memo<ProjectPanelWrapperProps>(
  function ProjectPanelWrapper({
    currentProjectId,
    isOpen,
    loadProject,
    onToggle,
    restoreLastGoodState,
  }) {
    const setOptimisticProjectId = useSetAtom(optimisticProjectIdAtom);

    const handleOpenProject = useCallback(
      async (projectId: string) => {
        // Set optimistic ID immediately for instant UI feedback
        setOptimisticProjectId(projectId);

        try {
          await loadProject(projectId);
        } catch (error) {
          // Clear optimistic state on error
          setOptimisticProjectId(null);
          restoreLastGoodState();
        }
      },
      [loadProject, restoreLastGoodState, setOptimisticProjectId]
    );

    return (
      <ProjectPanel
        currentProjectId={currentProjectId}
        isOpen={isOpen}
        onOpenProject={handleOpenProject}
        onToggle={onToggle}
      />
    );
  }
);
