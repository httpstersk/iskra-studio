import React, { useCallback, useRef, useState } from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { cn } from "@/lib/utils";
import { Crosshair } from "lucide-react";

interface MiniMapProps {
  images: PlacedImage[];
  videos: PlacedVideo[];
  viewport: {
    x: number;
    y: number;
    scale: number;
  };
  canvasSize: {
    width: number;
    height: number;
  };
  setViewport?: (viewport: { x: number; y: number; scale: number }) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  images,
  videos,
  viewport,
  canvasSize,
  setViewport,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const minimapRef = useRef<HTMLDivElement>(null);

  // Calculate bounds of all content
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  // images
  images.forEach((img) => {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
  });

  // videos
  videos.forEach((vid) => {
    minX = Math.min(minX, vid.x);
    minY = Math.min(minY, vid.y);
    maxX = Math.max(maxX, vid.x + vid.width);
    maxY = Math.max(maxY, vid.y + vid.height);
  });

  // If there are no elements, set default bounds
  if (
    minX === Infinity ||
    minY === Infinity ||
    maxX === -Infinity ||
    maxY === -Infinity
  ) {
    minX = 0;
    minY = 0;
    maxX = canvasSize.width;
    maxY = canvasSize.height;
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const miniMapWidth = 192; // 48 * 4 (w-48 in tailwind)
  const miniMapHeight = 128; // 32 * 4 (h-32 in tailwind)

  // Calculate scale to fit content in minimap
  const scaleX = miniMapWidth / contentWidth;
  const scaleY = miniMapHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add padding

  // Center content in minimap
  const offsetX = (miniMapWidth - contentWidth * scale) / 2;
  const offsetY = (miniMapHeight - contentHeight * scale) / 2;

  // Handle viewport dragging
  const handleViewportMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!setViewport) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [setViewport]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !setViewport || !minimapRef.current) return;

      const rect = minimapRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - offsetX;
      const y = e.clientY - rect.top - offsetY;

      // Convert minimap coordinates to canvas coordinates
      const canvasX = (x / scale + minX) * viewport.scale;
      const canvasY = (y / scale + minY) * viewport.scale;

      // Center the viewport on the clicked position
      const newViewportX = -(canvasX - canvasSize.width / (2 * viewport.scale)) * viewport.scale;
      const newViewportY = -(canvasY - canvasSize.height / (2 * viewport.scale)) * viewport.scale;

      setViewport({
        x: newViewportX,
        y: newViewportY,
        scale: viewport.scale,
      });
    },
    [isDragging, setViewport, scale, minX, minY, offsetX, offsetY, viewport.scale, canvasSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up event listeners
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const hasContent = images.length > 0 || videos.length > 0;

  return (
    <div
      className={cn(
        "absolute top-4 right-2 md:right-4 z-20",
        "flex flex-col gap-2",
        "select-none"
      )}
    >
      {/* Main minimap container */}
      <div
        className={cn(
          "rounded-2xl overflow-hidden",
          "bg-gradient-to-br from-card/98 via-card/95 to-card/92",
          "backdrop-blur-xl",
          "border border-border/60",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.2)]",
          "transition-all duration-200",
          isDragging && "shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_15px_50px_rgba(0,0,0,0.3)] scale-[1.02]"
        )}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border/40 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="h-3 w-3 text-muted-foreground/70" />
              <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
                Navigator
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500/60" />
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500/60" />
            </div>
          </div>
        </div>

        {/* Minimap content */}
        <div className="p-2">
          <div
            ref={minimapRef}
            className={cn(
              "relative w-32 h-24 md:w-48 md:h-32 rounded-lg overflow-hidden",
              "bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20",
              "border border-border/30",
              "shadow-inner",
              setViewport && "cursor-crosshair"
            )}
          >
            {/* Grid pattern background */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, currentColor 1px, transparent 1px),
                  linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                backgroundSize: "10px 10px",
              }}
            />

            {!hasContent && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[10px] text-muted-foreground/50 font-mono">
                  No content
                </p>
              </div>
            )}

            {/* Render tiny versions of images */}
            {images.map((img) => (
              <div
                key={img.id}
                className={cn(
                  "absolute rounded-sm transition-opacity",
                  "bg-gradient-to-br from-blue-500/60 to-blue-600/60",
                  "border border-blue-400/30",
                  "shadow-sm"
                )}
                style={{
                  left: `${(img.x - minX) * scale + offsetX}px`,
                  top: `${(img.y - minY) * scale + offsetY}px`,
                  width: `${img.width * scale}px`,
                  height: `${img.height * scale}px`,
                }}
              />
            ))}

            {videos.map((vid) => (
              <div
                key={vid.id}
                className={cn(
                  "absolute rounded-sm transition-opacity",
                  "bg-gradient-to-br from-purple-500/70 to-purple-600/70",
                  "border border-purple-400/40",
                  "shadow-sm"
                )}
                style={{
                  left: `${(vid.x - minX) * scale + offsetX}px`,
                  top: `${(vid.y - minY) * scale + offsetY}px`,
                  width: `${vid.width * scale}px`,
                  height: `${vid.height * scale}px`,
                }}
              />
            ))}

            {/* Viewport indicator */}
            <div
              className={cn(
                "absolute rounded-sm transition-all duration-100",
                "border-2 border-foreground/70",
                "bg-foreground/5",
                "backdrop-blur-[2px]",
                setViewport && "cursor-move hover:border-foreground/90 hover:bg-foreground/10",
                isDragging && "border-foreground bg-foreground/15 shadow-lg"
              )}
              style={{
                left: `${(-viewport.x / viewport.scale - minX) * scale + offsetX}px`,
                top: `${(-viewport.y / viewport.scale - minY) * scale + offsetY}px`,
                width: `${(canvasSize.width / viewport.scale) * scale}px`,
                height: `${(canvasSize.height / viewport.scale) * scale}px`,
              }}
              onMouseDown={handleViewportMouseDown}
            >
              {/* Corner indicators */}
              <div className="absolute top-0 left-0 w-1 h-1 bg-foreground/60 rounded-full" />
              <div className="absolute top-0 right-0 w-1 h-1 bg-foreground/60 rounded-full" />
              <div className="absolute bottom-0 left-0 w-1 h-1 bg-foreground/60 rounded-full" />
              <div className="absolute bottom-0 right-0 w-1 h-1 bg-foreground/60 rounded-full" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/70">
            <span>{Math.round(viewport.scale * 100)}%</span>
            <span>{images.length + videos.length} items</span>
          </div>
        </div>
      </div>
    </div>
  );
};
