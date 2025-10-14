/**
 * Project panel component for sidebar navigation.
 * 
 * Collapsible sidebar that displays the project list.
 * Provides toggle button and keyboard shortcut (Cmd/Ctrl+P).
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Folder, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectList } from "./project-list";
import { ProjectDialog } from "./project-dialog";
import { useProjects } from "@/hooks/useProjects";

/**
 * Props for ProjectPanel component.
 */
interface ProjectPanelProps {
  /** Initial collapsed state (default: true) */
  defaultCollapsed?: boolean;
  
  /** Callback when a project is opened */
  onOpenProject?: (projectId: string) => void;
}

/**
 * Project panel sidebar component.
 * 
 * Collapsible sidebar that shows the project list with toggle button.
 * Supports keyboard shortcut (Cmd/Ctrl+P) to toggle panel.
 * Includes slide animation using framer-motion.
 * 
 * @remarks
 * - Default state: collapsed
 * - Width: 320px when expanded
 * - Keyboard shortcut: Cmd/Ctrl+P (can be customized)
 * - Smooth slide-in/out animation
 * - Overlay on mobile (< 768px)
 * - Fixed sidebar on desktop (>= 768px)
 * 
 * @example
 * ```tsx
 * <ProjectPanel
 *   defaultCollapsed={false}
 *   onOpenProject={(id) => {
 *     router.push(`/project/${id}`);
 *   }}
 * />
 * ```
 */
export function ProjectPanel({
  defaultCollapsed = true,
  onOpenProject,
}: ProjectPanelProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const { projects, isLoading } = useProjects();

  const projectSummary = useMemo(() => {
    if (isLoading) return "Loading projects…";
    if (projects.length === 0) return "No projects yet";
    if (projects.length === 1) return "1 project";
    return `${projects.length} projects`;
  }, [isLoading, projects.length]);

  /**
   * Toggles the panel open/closed.
   */
  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Handles keyboard shortcut (Cmd/Ctrl+P).
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+P (Mac) or Ctrl+P (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        togglePanel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /**
   * Handles opening the new project dialog.
   */
  const handleNewProject = () => {
    setIsNewProjectDialogOpen(true);
  };

  /**
   * Handles project creation completion.
   */
  const handleProjectCreated = (projectId: string) => {
    setIsNewProjectDialogOpen(false);
    
    if (onOpenProject) {
      onOpenProject(projectId);
    }
  };

  return (
    <>
      {/* Toggle Button (always visible) */}
      <Button
        variant="default"
        size="sm"
        onClick={togglePanel}
        className={cn(
          "fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-primary/40 bg-surface/90 text-content-base shadow-lg backdrop-blur transition-all",
          isOpen && "text-primary",
          "md:w-auto md:px-4"
        )}
        title={`${isOpen ? "Close" : "Open"} Projects (Cmd/Ctrl+P)`}
        aria-label={`${isOpen ? "Close" : "Open"} Projects`}
      >
        {isOpen ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
        <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-primary md:inline">
          Projects
        </span>
      </Button>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-[22rem] flex-col border-r border-stroke-light/60 bg-surface/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-stroke-light/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-content-light">
                <Folder className="h-4 w-4 text-primary" />
                Library
              </div>
              <h2 className="mt-2 text-xl font-semibold text-content-base">Projects</h2>
              <p className="text-xs text-content-light/80">{projectSummary}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleNewProject}
                className="hidden shadow-md md:inline-flex"
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePanel}
                className="h-8 w-8 rounded-full border border-transparent hover:border-primary/40 hover:bg-primary/10"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-24 pt-5">
          <ProjectList
            variant="sidebar"
            onNewProject={handleNewProject}
            onOpenProject={(projectId) => {
              if (onOpenProject) {
                onOpenProject(projectId);
              }
              if (window.innerWidth < 768) {
                setIsOpen(false);
              }
            }}
          />
        </div>

        <div className="pointer-events-none relative z-10 mx-5 mb-5 rounded-lg border border-dashed border-stroke-light/60 bg-surface-light/40 px-4 py-4 text-center text-xs text-content-light">
          Press <kbd className="rounded bg-surface px-2 py-1 text-[11px] uppercase tracking-[0.2em]">Cmd/Ctrl+P</kbd> to toggle
        </div>
      </div>

      {/* Overlay (mobile only) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={togglePanel}
          aria-hidden="true"
        />
      )}

      {/* New Project Dialog */}
      <ProjectDialog
        open={isNewProjectDialogOpen}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}
