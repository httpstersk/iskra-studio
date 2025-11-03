/**
 * Project card component for displaying project metadata in the project list.
 *
 * Shows project thumbnail, name, last modified time, and element counts.
 * Provides actions for opening, renaming, and deleting projects.
 */

"use client";

import { useState } from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError, showErrorFromException, showSuccess } from "@/lib/toast";
import type { ProjectMetadata } from "@/types/project";
import { useProjects } from "@/hooks/useProjects";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Props for ProjectCard component.
 */
interface ProjectCardProps {
  /** Callback when project is clicked to open */
  onOpen?: (projectId: string) => void;

  /** Project metadata to display */
  project: ProjectMetadata;
}

/**
 * Project card component.
 *
 * Displays a project thumbnail with metadata and action menu.
 * Allows opening, renaming, and deleting projects.
 *
 * @remarks
 * - Shows thumbnail or placeholder if no thumbnail exists
 * - Displays relative time since last save ("2 hours ago")
 * - Shows counts of images and videos in the project
 * - Rename and delete actions show confirmation dialogs
 *
 * @example
 * ```tsx
 * <ProjectCard
 *   project={projectMetadata}
 *   onOpen={(id) => router.push(`/project/${id}`)}
 * />
 * ```
 */
export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const { renameProject } = useProjects();

  // State for rename dialog
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project.name);

  // State for delete confirmation dialog
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handles project click to open.
   */
  const handleClick = () => {
    if (onOpen) {
      onOpen(project.id);
    }
  };

  /**
   * Handles project rename.
   */
  const handleRename = async () => {
    if (!newName.trim()) {
      showError("Invalid name", "Project name cannot be empty");
      return;
    }

    try {
      await renameProject(project.id as Id<"projects">, newName.trim());
      setIsRenaming(false);

      showSuccess("Project renamed", `Project renamed to "${newName.trim()}"`);
    } catch (error) {
      showErrorFromException(
        "Rename failed",
        error,
        "Failed to rename project",
      );
    }
  };

  /**
   * Formats the last saved timestamp.
   */
  const formatLastSaved = () => {
    try {
      return formatDistanceToNow(project.lastSavedAt, { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden transition-all hover:border-primary hover:shadow-lg">
        {/* Thumbnail */}
        <div
          className="relative aspect-[3/2] cursor-pointer overflow-hidden bg-surface-light"
          onClick={handleClick}
        >
          {project.thumbnailUrl ? (
            <Image
              src={project.thumbnailUrl}
              alt={project.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-content-light">
              <ImageIcon className="h-12 w-12 opacity-50" />
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className="cursor-pointer font-medium text-content-base truncate hover:text-primary"
                onClick={handleClick}
                title={project.name}
              >
                {project.name}
              </h3>

              <p className="text-xs text-content-light mt-1">
                {formatLastSaved()}
              </p>

              {/* Element counts */}
              <div className="flex items-center gap-3 mt-2 text-xs text-content-light">
                {project.imageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {project.imageCount}
                  </span>
                )}
                {project.videoCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    {project.videoCount}
                  </span>
                )}
                {project.imageCount === 0 && project.videoCount === 0 && (
                  <span className="text-content-muted">Empty project</span>
                )}
              </div>
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleting(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
                placeholder="Enter project name"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{project.name}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
