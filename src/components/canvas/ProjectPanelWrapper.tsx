/**
 * ProjectPanelWrapper component - Memoized wrapper for ProjectPanel
 *
 * Prevents unnecessary rerenders by memoizing the component and its callbacks.
 *
 * @module components/canvas/ProjectPanelWrapper
 */

"use client";

import { ProjectPanel } from "@/components/projects/project-panel";
import type { Id } from "../../../convex/_generated/dataModel";
import React, { useCallback } from "react";

/**
 * Props for the ProjectPanelWrapper component
 */
interface ProjectPanelWrapperProps {
  currentProjectId: string | undefined;
  isOpen: boolean;
  loadProject: (projectId: Id<"projects">) => Promise<void>;
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
    const handleOpenProject = useCallback(
      async (projectId: Id<"projects">) => {
        // The optimistic ID is now handled inside loadProject to prevent race conditions
        // when rapidly switching between projects
        try {
          await loadProject(projectId);
        } catch (_error) {
          restoreLastGoodState();
        }
      },
      [loadProject, restoreLastGoodState],
    );

    return (
      <ProjectPanel
        currentProjectId={currentProjectId}
        isOpen={isOpen}
        onOpenProject={handleOpenProject}
        onToggle={onToggle}
      />
    );
  },
);
