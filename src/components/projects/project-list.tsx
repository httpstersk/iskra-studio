/**
 * Project list component for displaying all user projects.
 *
 * Shows a grid of project cards with a "New Project" button.
 * Includes loading states and empty state for no projects.
 */

"use client";

import { Plus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "./project-card";
import { useProjects } from "@/hooks/useProjects";

/**
 * Props for ProjectList component.
 */
interface ProjectListProps {
  /** Callback when new project button is clicked */
  onNewProject?: () => void;

  /** Callback when a project is clicked to open */
  onOpenProject?: (projectId: string) => void;
}

/**
 * Project list component.
 *
 * Displays all user projects in a responsive grid layout.
 * Shows loading skeleton while fetching projects.
 * Shows empty state when user has no projects.
 *
 * @remarks
 * - Grid adapts from 1 column (mobile) to 4 columns (desktop)
 * - "New Project" button always appears first
 * - Projects sorted by lastSavedAt (most recent first)
 *
 * @example
 * ```tsx
 * <ProjectList
 *   onNewProject={() => createProject()}
 *   onOpenProject={(id) => router.push(`/project/${id}`)}
 * />
 * ```
 */
export function ProjectList({ onNewProject, onOpenProject }: ProjectListProps) {
  const { projects, isLoading } = useProjects();

  /**
   * Renders loading skeleton.
   */
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-[3/2] w-full rounded-xl" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );

  /**
   * Renders empty state.
   */
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-surface-light p-6 mb-4">
        <Folder className="h-12 w-12 text-content-light" />
      </div>

      <h3 className="text-lg font-medium text-content-base mb-2">
        No projects yet
      </h3>

      <p className="text-sm text-content-light mb-6 max-w-sm">
        Create your first project to start designing with Iskra Studio.
      </p>

      {onNewProject && (
        <Button onClick={onNewProject} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Create Project
        </Button>
      )}
    </div>
  );

  /**
   * Renders project grid.
   */
  const renderProjects = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {/* New Project Button */}
      {onNewProject && (
        <button
          onClick={onNewProject}
          className="group relative aspect-[3/2] rounded-xl border-2 border-dashed border-stroke-light bg-surface transition-all hover:border-primary hover:bg-surface-light"
        >
          <div className="flex h-full flex-col items-center justify-center gap-2 text-content-light group-hover:text-primary">
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">New Project</span>
          </div>
        </button>
      )}

      {/* Project Cards */}
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={onOpenProject}
        />
      ))}
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
          <p className="text-sm text-content-light mt-1">
            Loading your projects...
          </p>
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
        </div>

        {renderEmptyState()}
      </div>
    );
  }

  // Projects list
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
          <p className="text-sm text-content-light mt-1">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>

        {/* Optional: Search/filter controls can go here */}
      </div>

      {renderProjects()}
    </div>
  );
}

/**
 * Skeleton component for loading state.
 *
 * Simple skeleton component if not using shadcn's Skeleton.
 */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-light ${className || ""}`}
    />
  );
}
