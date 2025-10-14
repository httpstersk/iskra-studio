/**
 * Project panel component for sidebar navigation.
 * 
 * Collapsible sidebar that displays the project list.
 * Provides toggle button and keyboard shortcut (Cmd/Ctrl+P).
 */

"use client";

import { useEffect, useState } from "react";
import { Folder, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProjectList } from "./project-list";
import { ProjectDialog } from "./project-dialog";

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
        size="icon"
        onClick={togglePanel}
        className="fixed left-4 top-4 z-50 shadow-lg"
        title={`${isOpen ? "Close" : "Open"} Projects (Cmd/Ctrl+P)`}
        aria-label={`${isOpen ? "Close" : "Open"} Projects`}
      >
        {isOpen ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <Folder className="h-5 w-5" />
        )}
      </Button>

      {/* Sidebar Panel */}
      <div
        className={`fixed left-0 top-0 z-40 h-full w-80 transform bg-surface border-r border-stroke-light shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stroke-light p-4">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-content-base">Projects</h2>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="h-[calc(100vh-4rem)] overflow-y-auto p-4">
          <ProjectList
            onNewProject={handleNewProject}
            onOpenProject={(projectId) => {
              if (onOpenProject) {
                onOpenProject(projectId);
              }
              // Optionally close panel on mobile after opening project
              if (window.innerWidth < 768) {
                setIsOpen(false);
              }
            }}
          />
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="absolute bottom-4 left-4 right-4 border-t border-stroke-light pt-4">
          <p className="text-xs text-content-light text-center">
            Press <kbd className="px-2 py-1 bg-surface-light rounded">Cmd/Ctrl+P</kbd> to toggle
          </p>
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
