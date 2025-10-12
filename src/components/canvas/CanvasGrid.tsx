import { useTheme } from "next-themes";
import React, { useMemo } from "react";
import { Group, Rect } from "react-konva";

import { CANVAS_GRID } from "@/constants/canvas";

interface CanvasGridProps {
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  gridSize?: number;
  gridColor?: string;
}

export const CanvasGrid: React.FC<CanvasGridProps> = ({
  viewport,
  canvasSize,
  gridSize = CANVAS_GRID.SPACING,
  gridColor,
}) => {
  const { resolvedTheme } = useTheme();

  // Set grid color based on theme
  const effectiveGridColor =
    gridColor ||
    (resolvedTheme === "dark"
      ? CANVAS_GRID.DARK_COLOR
      : CANVAS_GRID.LIGHT_COLOR);
  const dotRadius = CANVAS_GRID.DOT_RADIUS;

  const patternConfig = useMemo((): {
    image: HTMLCanvasElement;
    scale: { x: number; y: number };
  } | null => {
    if (typeof document === "undefined") {
      return null;
    }

    const scale = window.devicePixelRatio || 1;
    const size = gridSize * scale;
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = size;
    patternCanvas.height = size;

    const context = patternCanvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, size, size);
    context.fillStyle = effectiveGridColor;
    context.beginPath();
    context.arc(
      dotRadius * scale,
      dotRadius * scale,
      dotRadius * scale,
      0,
      Math.PI * 2
    );
    context.fill();

    return {
      image: patternCanvas,
      scale: { x: 1 / scale, y: 1 / scale },
    };
  }, [gridSize, effectiveGridColor, dotRadius]);

  // Calculate visible area in canvas coordinates
  const startX = Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
  const startY = Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
  const endX =
    Math.ceil((canvasSize.width - viewport.x) / viewport.scale / gridSize) *
    gridSize;
  const endY =
    Math.ceil((canvasSize.height - viewport.y) / viewport.scale / gridSize) *
    gridSize;

  if (!patternConfig) {
    return null;
  }

  return (
    <Group listening={false}>
      <Rect
        x={startX - dotRadius}
        y={startY - dotRadius}
        width={endX - startX + dotRadius * 2}
        height={endY - startY + dotRadius * 2}
        fillPatternImage={patternConfig.image as unknown as HTMLImageElement}
        fillPatternRepeat="repeat"
        fillPatternScaleX={patternConfig.scale.x}
        fillPatternScaleY={patternConfig.scale.y}
        listening={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
    </Group>
  );
};
