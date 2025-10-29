/**
 * Project dialog component for creating new projects.
 * 
 * Modal dialog with form for entering project name.
 * Validates input and creates project via useProjects hook.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { showErrorFromException, showSuccess } from "@/lib/toast";
import { useProjects } from "@/hooks/useProjects";
import type { Id } from "../../../convex/_generated/dataModel";

/**
 * Props for ProjectDialog component.
 */
interface ProjectDialogProps {
  /** Callback when project is successfully created */
  onProjectCreated?: (projectId: Id<"projects">) => void;
  
  /** Callback when dialog is closed */
  onClose?: () => void;
  
  /** Whether the dialog is open */
  open: boolean;
}

/**
 * Project creation dialog component.
 * 
 * Modal for creating new projects with name input and validation.
 * Automatically generates default names if left empty.
 * 
 * @remarks
 * - Empty names will use default "Iskra Project XX" naming
 * - Validates name is not just whitespace
 * - Shows loading state during creation
 * - Displays error toast on failure
 * - Calls onProjectCreated callback on success
 * 
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * <Button onClick={() => setIsOpen(true)}>
 *   New Project
 * </Button>
 * 
 * <ProjectDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onProjectCreated={(id) => {
 *     router.push(`/project/${id}`);
 *     setIsOpen(false);
 *   }}
 * />
 * ```
 */
export function ProjectDialog({
  open,
  onClose,
  onProjectCreated,
}: ProjectDialogProps) {
  const { createProject } = useProjects();

  const [projectName, setProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  /**
   * Handles project creation.
   */
  const handleCreate = async () => {
    try {
      setIsCreating(true);

      // Create project (empty name will use default naming)
      const projectId = await createProject(
        projectName.trim() || undefined
      );

      // Success toast
      showSuccess(
        "Project created",
        `"${projectName.trim() || "New project"}" has been created`
      );

      // Reset form
      setProjectName("");

      // Callback
      if (onProjectCreated) {
        onProjectCreated(projectId);
      }

      // Close dialog
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      
      showErrorFromException(
        "Creation failed",
        error,
        "Failed to create project"
      );
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Handles dialog close.
   */
  const handleClose = () => {
    if (isCreating) return; // Prevent close during creation
    
    // Reset form
    setProjectName("");
    
    if (onClose) {
      onClose();
    }
  };

  /**
   * Handles Enter key press in input.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter a name for your new project. Leave empty to use default naming.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">
              Project Name
              <span className="text-content-light ml-1">(optional)</span>
            </Label>
            <Input
              id="project-name"
              placeholder="e.g., My Amazing Design"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              autoFocus
            />
            <p className="text-xs text-content-light">
              If left empty, will be named &quot;Iskra Project XX&quot;
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
