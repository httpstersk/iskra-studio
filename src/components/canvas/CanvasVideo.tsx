import type { PlacedVideo } from "@/types/canvas";
import { throttleRAF } from "@/utils/performance";
import { snapPosition, triggerSnapHaptic } from "@/utils/snap-utils";
import Konva from "konva";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image as KonvaImage } from "react-konva";
import { useVideoElement } from "@/hooks/useVideoElement";
import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import { useVideoKeyboardShortcuts } from "@/hooks/useVideoKeyboardShortcuts";
import { useVideoDragWithSnap } from "@/hooks/useVideoDragWithSnap";

/**
 * Canvas video element rendered on the Konva stage.
 *
 * - Renders the current frame from an HTMLVideoElement
 * - Supports snap-to-grid dragging (no transform/resize)
 * - Provides keyboard shortcuts when selected
 */
interface CanvasVideoProps {
  dragStartPositions: Map<string, { x: number; y: number }>;
  isDraggingVideo: boolean;
  isSelected: boolean;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onResizeEnd?: () => void; // Kept for API compatibility (no-op)
  onResizeStart?: () => void; // Kept for API compatibility (no-op)
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  selectedIds: string[];
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  video: PlacedVideo;
  videos: PlacedVideo[]; // Not used directly; kept for prop parity
}

/**
 * CanvasVideo
 *
 * Renders a video frame on Konva and wires up drag, playback, and shortcuts.
 */
export const CanvasVideo: React.FC<CanvasVideoProps> = ({
  video,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  selectedIds,
  // videos is used in the type definition but not in the component
  setVideos,
  // isDraggingVideo is not used but kept for API compatibility
  dragStartPositions,
  onResizeStart,
  onResizeEnd,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);

  // Create HTMLVideoElement and wire events
  const videoElement = useVideoElement(
    video.src,
    {
      currentTime: video.currentTime,
      loop: video.isLooping,
      muted: video.muted,
      volume: video.volume,
    },
    (duration) => {
      // When metadata is loaded, update duration and mark loaded
      if (duration && duration !== video.duration) {
        onChange({ duration, isLoaded: true });
      } else {
        onChange({ isLoaded: true });
      }
    },
    (currentTime) => {
      onChange({ currentTime });
    }
  );

  // Sync playback props to element
  useVideoPlayback(videoElement, {
    currentTime: video.currentTime,
    isPlaying: video.isPlaying,
    loop: video.isLooping,
    muted: video.muted,
    onPlaybackError: (error) => {
      console.error("Error playing video:", error);
      onChange({ isPlaying: false });
    },
    volume: video.volume,
  });

  // Keyboard shortcuts when selected
  useVideoKeyboardShortcuts(isSelected, {
    togglePlay: () => onChange({ isPlaying: !video.isPlaying }),
    seekBy: (delta) =>
      onChange({
        currentTime: Math.min(
          video.duration,
          Math.max(0, video.currentTime + delta)
        ),
      }),
    volumeBy: (delta) => {
      if (!video.muted) {
        onChange({ volume: Math.min(1, Math.max(0, video.volume + delta)) });
      }
    },
    toggleMute: () => onChange({ muted: !video.muted }),
  });

  // Snap-to-grid drag handler
  const { onDragMove, reset } = useVideoDragWithSnap(
    {
      dragStartPositions,
      selectedIds,
      selfId: video.id,
    },
    setVideos,
    onChange
  );

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={videoElement || undefined}
        x={video.x}
        y={video.y}
        width={video.width}
        height={video.height}
        rotation={video.rotation}
        draggable={isDraggable}
        perfectDrawEnabled={false}
        onClick={(e) => {
          // Prevent event propagation issues
          e.cancelBubble = true;
          onSelect(e);
          // Toggle play/pause on click if already selected
          // Use setTimeout to ensure selection state is updated first
          if (isSelected) {
            setTimeout(() => {
              onChange({ isPlaying: !video.isPlaying });
            }, 0);
          }
        }}
        onTap={onSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          // Only allow dragging with left mouse button (0)
          // Middle mouse (1) and right mouse (2) should not drag videos
          const isLeftButton = e.evt.button === 0;
          setIsDraggable(isLeftButton);

          // For middle mouse button, don't stop propagation
          // Let it bubble up to the stage for canvas panning
          if (e.evt.button === 1) {
            return;
          }
        }}
        onMouseUp={() => {
          // Re-enable dragging after mouse up
          setIsDraggable(true);
        }}
        onDragStart={(e) => {
          // Stop propagation to prevent stage from being dragged
          e.cancelBubble = true;
          // Auto-select on drag if not already selected
          if (!isSelected) {
            onSelect(e);
          }
          // Hide video controls during drag
          if (onResizeStart) {
            onResizeStart();
          }
          onDragStart();
        }}
        onDragMove={onDragMove}
        onDragEnd={() => {
          // Reset snap tracking on drag end
          reset();
          onDragEnd();
        }}
        opacity={video.isGenerating ? 0.9 : 1}
        stroke={isSelected ? "#3b82f6" : isHovered ? "#3b82f6" : "transparent"}
        strokeWidth={isSelected || isHovered ? 2 : 0}
      />
    </>
  );
};
