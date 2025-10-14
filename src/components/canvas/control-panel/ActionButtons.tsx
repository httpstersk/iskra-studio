"use client";

import { Button } from "@/components/ui/button";
import {
  CONTROL_PANEL_STRINGS,
  CONTROL_PANEL_STYLES,
} from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { Redo, Undo } from "lucide-react";
import React from "react";

/**
 * Props for the ActionButtons component
 */
interface ActionButtonsProps {
  canRedo: boolean;
  canUndo: boolean;
  redo: () => void;
  undo: () => void;
}

/**
 * Undo/Redo action buttons component
 */
export const ActionButtons = React.memo(function ActionButtons({
  canRedo,
  canUndo,
  redo,
  undo,
}: ActionButtonsProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-clip flex items-center",
        CONTROL_PANEL_STYLES.GROUP_SHADOW,
        "dark:shadow-none dark:border dark:border-border"
      )}
    >
      <Button
        className="rounded-none"
        disabled={!canUndo}
        onClick={undo}
        size="icon-sm"
        title={CONTROL_PANEL_STRINGS.UNDO}
        variant="ghost"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border" />

      <Button
        className="rounded-none"
        disabled={!canRedo}
        onClick={redo}
        size="icon-sm"
        title={CONTROL_PANEL_STRINGS.REDO}
        variant="ghost"
      >
        <Redo className="h-4 w-4" strokeWidth={2} />
      </Button>
    </div>
  );
});
