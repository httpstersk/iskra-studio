/**
 * Project panel component for sidebar navigation.
 *
 * Collapsible sidebar that displays the project list.
 * Supports keyboard shortcut (Cmd/Ctrl+P) when external toggle handler is provided.
 */

"use client";

import { Loader } from "@/components/ai-elements/loader";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { PanelLeftClose, Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

/**
 * Props for ProjectPanel component.
 */
interface ProjectPanelProps {
  /** ID of the currently selected project */
  currentProjectId?: string;

  /** Whether the panel is open */
  isOpen?: boolean;

  /** Callback when a project is opened */
  onOpenProject?: (projectId: Id<"projects">) => void;

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
  currentProjectId,
  isOpen = false,
  onOpenProject,
  onToggle,
}: ProjectPanelProps) {
  const { projects, isLoading, createProject } = useProjects();

  const projectNumbers = useMemo(
    (): { id: Id<"projects">; label: string }[] =>
      projects.map((project, index) => ({
        id: project.id as Id<"projects">,
        label: `${(index + 1).toString().padStart(2, "0")}`,
      })),
    [projects],
  );

  /**
   * Toggles the panel open/closed.
   */
  const togglePanel = () => {
    onToggle?.();
  };

  // Store latest onToggle in ref
  const toggleRef = useRef(onToggle);
  toggleRef.current = onToggle;

  /**
   * Handles keyboard shortcut (Cmd/Ctrl+P).
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+P (Mac) or Ctrl+P (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        toggleRef.current?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // ✅ Empty deps - uses ref for latest callback

  /**
   * Handles creating a new project with auto-generated name.
   */
  const handleNewProject = async () => {
    const projectNumber = String(projects.length + 1).padStart(2, "0");
    const projectName = `Project ${projectNumber}`;
    const projectId = await createProject(projectName);

    if (onOpenProject) {
      onOpenProject(projectId);
    }
  };

  /**
   * Handles opening a project.
   */
  const handleOpenProject = async (projectId: Id<"projects">) => {
    await onOpenProject?.(projectId);
  };

  return (
    <aside>
      {/* Sidebar Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-[60] flex h-full w-[5.5rem]",
          "flex-col items-center overflow-hidden border border-border/55 border-l-0",
          "bg-card/96 backdrop-blur-2xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.45)]",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full w-full flex-col items-center px-3 py-6">
          <div className="flex w-full flex-col items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePanel}
              customVariant={cn(
                "h-11 w-11 rounded-full border border-border/50",
                "bg-card/85 text-muted-foreground",
                "transition hover:border-border/40 hover:bg-card/90 hover:text-foreground",
              )}
            >
              <PanelLeftClose className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>

          <div className="mt-6 h-px w-10 bg-border/40" aria-hidden="true" />

          <div className="mt-6 w-full overflow-y-auto">
            <div className="flex flex-col items-center gap-2.5 pb-4">
              {/* Show skeleton loaders only on initial load (when no projects exist yet) */}
              {isLoading && projects.length === 0 && (
                <div className="flex w-full flex-col items-center gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-11 w-11 animate-pulse rounded-full border border-border/45 bg-card/85"
                    />
                  ))}
                </div>
              )}

              {/* Always show projects once loaded */}
              {projectNumbers.length > 0 &&
                projectNumbers.map(({ id, label }) => {
                  const isSelected = currentProjectId === id;
                  const isLoadingThisProject = isLoading && isSelected;
                  return (
                    <button
                      key={id}
                      onClick={() => handleOpenProject(id)}
                      className={cn(
                        "group flex h-11 w-11 items-center justify-center rounded-full border",
                        "bg-card/85 text-xs text-foreground",
                        "transition-all duration-200",
                        isSelected
                          ? "border-transparent bg-secondary text-secondary-foreground shadow-none opacity-100"
                          : "border-border/45 hover:border-border/30 hover:bg-card/90 opacity-50 hover:opacity-100",
                      )}
                      disabled={isLoadingThisProject}
                    >
                      {isLoadingThisProject ? (
                        <Loader size={16} className="text-primary" />
                      ) : (
                        <span
                          className={cn(
                            "text-sm font-mono transition",
                            isSelected
                              ? "text-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          {label}
                        </span>
                      )}
                    </button>
                  );
                })}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewProject}
                customVariant={cn(
                  "mt-2 h-11 w-11 rounded-full border border-border/45",
                  "bg-card/88 text-foreground",
                  "transition hover:border-border/30 hover:bg-card/95",
                )}
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">New project</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
