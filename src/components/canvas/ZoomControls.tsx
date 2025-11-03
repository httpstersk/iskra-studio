"use client";

import { Button } from "@/components/ui/button";
import type { Viewport } from "@/store/canvas-atoms";
import { zoomViewport, clampScale } from "@/utils/viewport-utils";
import { Minus, Plus, Maximize2, PanelsTopLeft } from "lucide-react";
import { memo, useCallback } from "react";

interface ZoomControlsProps {
  canvasSize: { width: number; height: number };
  setViewport: (vp: Viewport) => void;
  viewport: Viewport;
  isProjectsPanelOpen?: boolean;
  onToggleProjectsPanel?: () => void;
}

export const ZoomControls = memo(function ZoomControls({
  canvasSize,
  setViewport,
  viewport,
  isProjectsPanelOpen,
  onToggleProjectsPanel,
}: ZoomControlsProps) {
  const handleZoom = useCallback(
    (delta: number) => {
      const centerX = canvasSize.width / 2;
      const centerY = canvasSize.height / 2;
      setViewport(zoomViewport(viewport, centerX, centerY, delta));
    },
    [canvasSize.height, canvasSize.width, setViewport, viewport],
  );

  const handleReset = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  }, [setViewport]);

  const canZoomIn = clampScale(viewport.scale + 0.1) !== viewport.scale;
  const canZoomOut = clampScale(viewport.scale - 0.1) !== viewport.scale;

  return (
    <div className="pointer-events-auto fixed right-6 md:bottom-6 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2">
      {onToggleProjectsPanel && (
        <Button
          variant="secondary"
          size="icon-sm"
          aria-pressed={!!isProjectsPanelOpen}
          onClick={onToggleProjectsPanel}
          title="Toggle projects"
          className="rounded"
        >
          <PanelsTopLeft className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-center overflow-hidden rounded border border-border bg-background/80 shadow-sm">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleZoom(-0.1)}
          disabled={!canZoomOut}
          className="rounded-none"
          title="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleReset}
          title="Reset view"
          className="rounded-none"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleZoom(0.1)}
          disabled={!canZoomIn}
          className="rounded-none"
          title="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
