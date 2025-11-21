import { useAnimationCoordinator } from "@/hooks/useAnimationCoordinator";
import { useSharedSkeletonAnimation } from "@/hooks/useSharedSkeletonAnimation";
import { useSharedVideoAnimation } from "@/hooks/useSharedVideoAnimation";
import { useVideoDragWithSnap } from "@/hooks/useVideoDragWithSnap";
import { useVideoElement } from "@/hooks/useVideoElement";
import { useVideoKeyboardShortcuts } from "@/hooks/useVideoKeyboardShortcuts";
import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import type { PlacedVideo } from "@/types/canvas";
import Konva from "konva";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import { useVideoPixelatedOverlay } from "./canvas-video-hooks";
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

  // Skeleton shimmer animation - uses shared coordinator for performance
  const shimmerOpacity = useSharedSkeletonAnimation(!!video.isSkeleton);

  // Get pixelated overlay if available (skip for skeletons)
  const pixelatedImg = useVideoPixelatedOverlay(
    video.isSkeleton ? undefined : video.pixelatedSrc
  );

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

  // Animation coordinator for pixelated overlay transition
  const {
    displayOpacity,
    isTransitionComplete,
    pixelatedOpacity: animatedPixelatedOpacity,
  } = useAnimationCoordinator({
    hasImage: !!videoElement,
    hasPixelated: !!pixelatedImg,
    isGenerated: Boolean(!video.isLoading && video.src),
    isLoading: Boolean(video.isLoading),
  });

  // Calculate opacities for layers
  const videoOpacity = video.isGenerating ? 0.9 : 1;
  const overlayOpacity = displayOpacity * animatedPixelatedOpacity;

  // Sync playback props to element
  useVideoPlayback(videoElement, {
    currentTime: video.currentTime,
    isPlaying: video.isPlaying,
    loop: video.isLooping,
    muted: video.muted,
    onPlaybackError: (_error) => {
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

  // Clear pixelatedSrc after transition completes to free memory
  useEffect(() => {
    if (isTransitionComplete && video.pixelatedSrc && !video.isLoading) {
      onChange({
        pixelatedSrc: undefined,
      });
    }
  }, [isTransitionComplete, video.pixelatedSrc, video.isLoading, onChange]);

  // Use shared video animation coordinator for playing videos
  // All videos share a single optimized animation loop with:
  // - Batched layer redraws (one per layer, not per video)
  // - Page Visibility API (pauses when tab hidden)
  // - Adaptive FPS based on device performance
  useSharedVideoAnimation(shapeRef, video.isPlaying, video.src);

  // Skeleton placeholder rendering - shows before real video loads
  if (video.isSkeleton) {
    return (
      <Group x={video.x} y={video.y} rotation={video.rotation} listening={false}>
        <Rect
          width={video.width}
          height={video.height}
          cornerRadius={8}
          fill="#1a1a1a"
          opacity={0.5}
          listening={false}
          perfectDrawEnabled={false}
        />
        <Rect
          width={video.width}
          height={video.height}
          cornerRadius={8}
          fill="#2a2a2a"
          opacity={shimmerOpacity}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>
    );
  }

  // Render both video and pixelated overlay during transition
  if (pixelatedImg && !isTransitionComplete && videoElement) {
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
        {/* Video frame - fades from low to full opacity during transition */}
        <KonvaImage
          height={video.height}
          image={videoElement}
          listening={false}
          opacity={displayOpacity * videoOpacity}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          width={video.width}
          x={0}
          y={0}
        />
        {/* Pixelated overlay - fades from full to zero opacity during transition */}
        <KonvaImage
          height={video.height}
          image={pixelatedImg}
          listening={false}
          opacity={overlayOpacity}
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          width={video.width}
          x={0}
          y={0}
        />
        {/* Interactive layer for clicks/hover */}
        <KonvaImage
          height={video.height}
          image={videoElement}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onTap={onSelect}
          opacity={0}
          perfectDrawEnabled={false}
          ref={shapeRef}
          shadowForStrokeEnabled={false}
          stroke={
            isSelected ? "#0ea5e9" : isHovered ? "#0ea5e9" : "transparent"
          }
          strokeScaleEnabled={false}
          strokeWidth={isSelected || isHovered ? 2 : 0}
          width={video.width}
          x={0}
          y={0}
        />
        <KonvaVideoControls
          video={video}
          onChange={onChange}
          isSelected={isSelected}
        />
      </Group>
    );
  }

  // Render only pixelated overlay if video hasn't loaded yet
  if (pixelatedImg && !videoElement) {
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
          image={pixelatedImg}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onTap={onSelect}
          opacity={displayOpacity}
          perfectDrawEnabled={false}
          ref={shapeRef}
          shadowForStrokeEnabled={false}
          stroke={
            isSelected ? "#0ea5e9" : isHovered ? "#0ea5e9" : "transparent"
          }
          strokeScaleEnabled={false}
          strokeWidth={isSelected || isHovered ? 2 : 0}
          width={video.width}
          x={0}
          y={0}
        />
        <KonvaVideoControls
          video={video}
          onChange={onChange}
          isSelected={isSelected}
        />
      </Group>
    );
  }

  // Default rendering without pixelated overlay
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
        opacity={videoOpacity * displayOpacity}
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
      <KonvaVideoControls
        video={video}
        onChange={onChange}
        isSelected={isSelected}
      />
    </Group>
  );
};

CanvasVideoComponent.displayName = "CanvasVideo";

export const CanvasVideo = React.memo(CanvasVideoComponent);
