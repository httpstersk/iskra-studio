/**
 * Project list component for displaying all user projects.
 *
 * Shows a grid of project cards with a "New Project" button.
 * Includes loading states and empty state for no projects.
 */

"use client";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronRight,
  Folder,
  Image as ImageIcon,
  Plus,
  Video,
} from "lucide-react";
import { ProjectCard } from "./project-card";

/**
 * Props for ProjectList component.
 */
interface ProjectListProps {
  /** Callback when new project button is clicked */
  onNewProject?: () => void;

  /** Callback when a project is clicked to open */
  onOpenProject?: (projectId: string) => void;

  /** Layout variant for rendering the project list */
  variant?: "grid" | "sidebar";
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
export function ProjectList({
  onNewProject,
  onOpenProject,
  variant = "grid",
}: ProjectListProps) {
  const { projects, isLoading } = useProjects();
  const isSidebar = variant === "sidebar";

  const formatLastUpdated = (timestamp: number | Date) => {
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const renderGridSkeleton = () => (
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

  const renderSidebarSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/20 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
        >
          <Skeleton className="h-11 w-11 rounded-xl !bg-sidebar-accent/40" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-3 w-3/5 rounded-full !bg-sidebar-accent/35" />
            <Skeleton className="h-3 w-2/5 rounded-full !bg-sidebar-accent/35" />
          </div>
          <Skeleton className="h-6 w-14 rounded-full !bg-sidebar-accent/30" />
        </div>
      ))}
    </div>
  );

  const renderGridEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-surface-light p-6">
        <Folder className="h-12 w-12 text-content-light" />
      </div>
      <h3 className="mb-2 text-lg font-medium text-content-base">
        No projects yet
      </h3>
      <p className="mb-6 max-w-sm text-sm text-content-light">
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

  const renderSidebarEmptyState = () => (
    <div className="rounded-2xl border border-dashed border-sidebar-border/55 bg-sidebar-accent/20 px-6 py-14 text-center shadow-[0_18px_48px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-sidebar-border/40 bg-sidebar-accent/35 text-muted-foreground">
        <Folder className="h-6 w-6" />
      </div>
      <p className="mt-6 text-sm font-semibold text-foreground">
        No projects yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground/80">
        Create a project to keep your ideas organized.
      </p>
      {onNewProject && (
        <Button
          className="mt-6"
          onClick={onNewProject}
          size="sm"
          variant="ghost"
          customVariant="rounded-xl border border-sidebar-border/60 bg-sidebar-accent/35 px-4 py-2 text-xs font-semibold text-foreground hover:border-sidebar-ring/60 hover:bg-sidebar-accent/55"
        >
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      )}
    </div>
  );

  const renderGridProjects = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onOpen={onOpenProject}
        />
      ))}
    </div>
  );

  const renderSidebarProjects = () => (
    <div className="space-y-3">
      {projects.map((project) => (
        <button
          key={project.id}
          onClick={() => onOpenProject?.(project.id)}
          className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-sidebar-border/55 bg-sidebar/75 px-4 py-4 text-left shadow-[0_22px_60px_rgba(0,0,0,0.6)] transition hover:border-sidebar-ring/55 hover:bg-sidebar/80"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sidebar-border/40 bg-sidebar-accent/40 text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.55)]">
            <Folder className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold text-foreground"
              title={project.name}
            >
              {project.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/80">
              <span className="rounded-full border border-sidebar-border/45 bg-sidebar-accent/25 px-3 py-1">
                Updated {formatLastUpdated(project.lastSavedAt)}
              </span>
              {project.imageCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-sidebar-border/45 bg-sidebar-accent/25 px-3 py-1">
                  <ImageIcon className="h-3 w-3" />
                  {project.imageCount}
                </span>
              )}
              {project.videoCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-sidebar-border/45 bg-sidebar-accent/25 px-3 py-1">
                  <Video className="h-3 w-3" />
                  {project.videoCount}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-foreground" />
        </button>
      ))}
    </div>
  );

  if (isSidebar) {
    const hasProjects = projects.length > 0;
    const showQuickCreate = onNewProject && hasProjects && !isLoading;

    return (
      <div className="flex h-full flex-col gap-4">
        {showQuickCreate && (
          <button
            onClick={onNewProject}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-dashed border-sidebar-border/60 bg-sidebar-accent/20 px-5 py-4 text-left shadow-[0_16px_44px_rgba(0,0,0,0.55)] transition hover:border-sidebar-ring/60 hover:bg-sidebar-accent/35"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-sidebar-border/45 bg-sidebar-accent/35 text-foreground shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                <Plus className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  New project
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Start from scratch
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition group-hover:translate-x-1 group-hover:text-foreground" />
          </button>
        )}

        {isLoading && renderSidebarSkeleton()}
        {!isLoading && !hasProjects && renderSidebarEmptyState()}
        {!isLoading && hasProjects && renderSidebarProjects()}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
          <p className="mt-1 text-sm text-content-light">
            Loading your projects...
          </p>
        </div>
        {renderGridSkeleton()}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="container mx-auto px-6 py-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
        </div>
        {renderGridEmptyState()}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-content-base">My Projects</h2>
          <p className="mt-1 text-sm text-content-light">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>
      </div>
      {renderGridProjects()}
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
      className={cn("animate-pulse rounded-lg bg-surface-light", className)}
    />
  );
}
