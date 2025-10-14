/**
 * Project panel component for sidebar navigation.
 * 
 * Collapsible sidebar that displays the project list.
 * Supports keyboard shortcut (Cmd/Ctrl+P) when external toggle handler is provided.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Folder, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProjectList } from "./project-list";
import { ProjectDialog } from "./project-dialog";
import { useProjects } from "@/hooks/useProjects";

/**
 * Props for ProjectPanel component.
 */
interface ProjectPanelProps {
  /** Whether the panel is open */
  isOpen?: boolean;

  /** Callback when a project is opened */
  onOpenProject?: (projectId: string) => void;

  /** Callback to toggle the panel */
  onToggle?: () => void;
}

/**
 * Project panel sidebar component.
 * 
 * Collapsible sidebar that shows the project list.
 * Supports keyboard shortcut (Cmd/Ctrl+P) to toggle panel when onToggle is provided.
 * 
 * @remarks
 * - Controlled component: uses isOpen prop for state
 * - Width: 320px when expanded
 * - Keyboard shortcut: Cmd/Ctrl+P (requires onToggle callback)
 * - Smooth slide-in/out animation
 * - Overlay on mobile (< 768px)
 * - Fixed sidebar on desktop (>= 768px)
 * 
 * @example
 * ```tsx
 * <ProjectPanel
 *   isOpen={isPanelOpen}
 *   onToggle={() => setIsPanelOpen(!isPanelOpen)}
 *   onOpenProject={(id) => {
 *     router.push(`/project/${id}`);
 *   }}
 * />
 * ```
 */
export function ProjectPanel({
  isOpen = false,
  onOpenProject,
  onToggle,
}: ProjectPanelProps) {
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
    onToggle?.();
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
    <aside>
      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-[60] flex h-full w-[22rem] flex-col border-r border-border/50 bg-card/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-border/50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Folder className="h-4 w-4 text-foreground" />
                Library
              </div>
              <h2 className="mt-2 text-xl font-semibold text-foreground">Projects</h2>
              <p className="text-xs text-muted-foreground">{projectSummary}</p>
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
                className="h-8 w-8 rounded-full border border-transparent hover:border-border/50 hover:bg-accent"
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
              if (window.innerWidth < 768 && isOpen) {
                togglePanel();
              }
            }}
          />
        </div>

        <div className="pointer-events-none relative z-10 mx-5 mb-5 rounded-lg border border-dashed border-border/50 bg-secondary/40 px-4 py-4 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded bg-input px-2 py-1 text-[11px] uppercase tracking-[0.2em]">Cmd/Ctrl+P</kbd> to toggle
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
    </aside>
  );
}
