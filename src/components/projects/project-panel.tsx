/**
 * Project panel component for sidebar navigation.
 *
 * Collapsible sidebar that displays the project list.
 * Supports keyboard shortcut (Cmd/Ctrl+P) when external toggle handler is provided.
 */

"use client";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { PanelLeftClose, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProjectDialog } from "./project-dialog";

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

  const projectNumbers = useMemo(
    () =>
      projects.map((project, index) => ({
        id: project.id,
        label: `${(index + 1).toString().padStart(2, "0")}`,
      })),
    [projects]
  );

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
          "fixed left-0 top-0 z-[60] flex h-full w-[5.5rem]",
          "flex-col items-center overflow-hidden border-r border-sidebar-border/60",
          "bg-sidebar/95 backdrop-blur-xl",
          "shadow-[0_20px_40px_rgba(0,0,0,0.5)]",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full w-full flex-col items-center px-3 py-6">
          <div className="flex w-full flex-col items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePanel}
              customVariant={cn(
                "h-11 w-11 rounded-2xl border border-sidebar-border/60",
                "bg-sidebar-accent/35 text-muted-foreground",
                "shadow-[0_10px_24px_rgba(0,0,0,0.45)] transition hover:border-sidebar-ring/60 hover:bg-sidebar-accent/55 hover:text-foreground"
              )}
            >
              <PanelLeftClose className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewProject}
              customVariant={cn(
                "h-11 w-11 rounded-2xl border border-sidebar-border/60",
                "bg-sidebar-accent/35 text-foreground",
                "shadow-[0_10px_26px_rgba(0,0,0,0.45)] transition hover:border-sidebar-ring/60 hover:bg-sidebar-accent/55"
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">New project</span>
            </Button>
          </div>

          <div
            className="mt-6 h-px w-10 bg-sidebar-border/50"
            aria-hidden="true"
          />

          <div className="mt-6 flex w-full flex-1 flex-col items-center gap-2.5 overflow-y-auto pb-8">
            {isLoading && (
              <div className="flex w-full flex-col items-center gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 w-11 animate-pulse rounded-2xl border border-sidebar-border/55 bg-sidebar-accent/35"
                  />
                ))}
              </div>
            )}

            {!isLoading && projectNumbers.length === 0 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                No projects yet
              </p>
            )}

            {!isLoading &&
              projectNumbers.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    onOpenProject?.(id);
                    if (window.innerWidth < 768 && isOpen) {
                      togglePanel();
                    }
                  }}
                  className={cn(
                    "group flex h-11 w-11 items-center justify-center rounded-2xl border border-sidebar-border/60",
                    "bg-sidebar/80 text-xs font-semibold text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
                    "transition hover:border-sidebar-ring/60 hover:bg-sidebar/85"
                  )}
                >
                  <span className="text-base font-normal text-muted-foreground transition group-hover:text-foreground">
                    {label}
                  </span>
                </button>
              ))}
          </div>
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
