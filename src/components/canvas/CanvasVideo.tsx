import { useSharedVideoAnimation } from "@/hooks/useSharedVideoAnimation";
import { useVideoDragWithSnap } from "@/hooks/useVideoDragWithSnap";
import { useVideoElement } from "@/hooks/useVideoElement";
import { useVideoKeyboardShortcuts } from "@/hooks/useVideoKeyboardShortcuts";
import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import type { PlacedVideo } from "@/types/canvas";
import Konva from "konva";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import { KonvaVideoControls } from "./KonvaVideoControls";

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
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  selectedIds: string[];
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  video: PlacedVideo;
}

/**
 * CanvasVideo
 *
 * Renders a video frame on Konva and wires up drag, playback, and shortcuts.
 */
const CanvasVideoComponent: React.FC<CanvasVideoProps> = ({
  dragStartPositions,
  isSelected,
  onChange,
  onDragEnd,
  onDragStart,
  onSelect,
  selectedIds,
  setVideos,
  video,
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

  const { onDragMove, reset } = useVideoDragWithSnap(
    {
      dragStartPositions,
      selectedIds,
      selfId: video.id,
    },
    setVideos,
    onChange
  );

  /**
   * Handles video click - selects video and toggles play/pause if already selected
   */
  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;

      if (isSelected) {
        onChange({ isPlaying: !video.isPlaying });
      } else {
        onSelect(e);
      }
    },
    [isSelected, onChange, onSelect, video.isPlaying]
  );

  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;

      if (!isSelected) {
        onSelect(e as unknown as Konva.KonvaEventObject<MouseEvent>);
      }

      onDragStart();
    },
    [isSelected, onDragStart, onSelect]
  );

  const handleDragEnd = useCallback(() => {
    reset();
    onDragEnd();
  }, [onDragEnd, reset]);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const isLeftButton = e.evt.button === 0;
      setIsDraggable(isLeftButton);

      if (e.evt.button === 1) {
        return;
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggable(true);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Initial draw when video element loads or changes
  // This ensures paused videos are visible with their first frame
  useEffect(() => {
    if (videoElement && shapeRef.current) {
      const layer = shapeRef.current.getLayer();
      if (layer) layer.batchDraw();
    }
  }, [videoElement]);

  // Use shared video animation coordinator for playing videos
  // All videos share a single optimized animation loop with:
  // - Batched layer redraws (one per layer, not per video)
  // - Page Visibility API (pauses when tab hidden)
  // - Adaptive FPS based on device performance
  useSharedVideoAnimation(shapeRef, video.isPlaying, video.src);

  return (
    <Group
      x={video.x}
      y={video.y}
      rotation={video.rotation}
      draggable={isDraggable}
      onDragEnd={handleDragEnd}
      onDragMove={onDragMove}
      onDragStart={handleDragStart}
    >
      <KonvaImage
        height={video.height}
        image={videoElement || undefined}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onTap={onSelect}
        opacity={video.isGenerating ? 0.9 : 1}
        perfectDrawEnabled={false}
        ref={shapeRef}
        shadowForStrokeEnabled={false}
        stroke={isSelected ? "#0ea5e9" : isHovered ? "#0ea5e9" : "transparent"}
        strokeScaleEnabled={false}
        strokeWidth={isSelected || isHovered ? 2 : 0}
        width={video.width}
        x={0}
        y={0}
      />
      <KonvaVideoControls video={video} onChange={onChange} isSelected={isSelected} />
    </Group>
  );
};

CanvasVideoComponent.displayName = "CanvasVideo";

export const CanvasVideo = React.memo(CanvasVideoComponent);
