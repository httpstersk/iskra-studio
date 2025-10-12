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
import { Image as KonvaImage, Transformer } from "react-konva";

interface CanvasVideoProps {
  video: PlacedVideo;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  selectedIds: string[];
  videos: PlacedVideo[];
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  isDraggingVideo: boolean;
  dragStartPositions: Map<string, { x: number; y: number }>;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

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
  const trRef = useRef<Konva.Transformer>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null
  );
  // isVideoLoaded is used to track when the video is ready but not directly referenced
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  // isResizing is used to track resize state for internal component logic
  const [isResizing, setIsResizing] = useState(false);
  const lastUpdateTime = useRef<number>(0);
  const lastSnapPos = useRef<{ x: number; y: number } | null>(null);

  // Create and set up the video element when the component mounts or video src changes
  useEffect(() => {
    // Don't create video element if src is empty (still loading)
    if (!video.src) {
      setVideoElement(null);
      setIsVideoLoaded(false);
      return;
    }

    const videoEl = document.createElement("video");
    videoEl.src = video.src;
    videoEl.crossOrigin = "anonymous";
    videoEl.muted = video.muted;
    videoEl.volume = video.volume;
    videoEl.currentTime = video.currentTime;
    videoEl.loop = !!video.isLooping;

    // Performance optimizations
    videoEl.preload = "metadata"; // Changed from 'auto' to reduce bandwidth/memory
    videoEl.playsInline = true;
    videoEl.disablePictureInPicture = true;

    // Throttled time update handler - RAF synced for smoother updates
    const handleTimeUpdate = throttleRAF(() => {
      onChange({ currentTime: videoEl.currentTime });
    });

    // Set up event listeners
    const handleLoadedMetadata = () => {
      if (videoEl.duration !== video.duration) {
        onChange({ duration: videoEl.duration });
      }
      if (!video.isPlaying) {
        videoEl.currentTime = 0;
      }
      // Reduced delay for faster perceived loading
      setTimeout(() => {
        setIsVideoLoaded(true);
        onChange({ isLoaded: true });
      }, 100);
    };

    const handleEnded = () => {
      if (!video.isLooping) {
        onChange({ isPlaying: false, currentTime: 0 });
      }
    };

    const handleLoadedData = () => {
      setVideoElement(videoEl);
    };

    videoEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("ended", handleEnded);
    videoEl.addEventListener("loadeddata", handleLoadedData);

    setVideoElement(videoEl);
    videoRef.current = videoEl;
    videoEl.load();

    return () => {
      // Clean up all listeners explicitly
      videoEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("ended", handleEnded);
      videoEl.removeEventListener("loadeddata", handleLoadedData);
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
    };
  }, [video.src]);

  // Handle play/pause state changes
  useEffect(() => {
    if (!videoElement) return;

    if (video.isPlaying) {
      videoElement.play().catch((error) => {
        console.error("Error playing video:", error);
        onChange({ isPlaying: false });
      });
    } else {
      videoElement.pause();
    }
  }, [video.isPlaying, videoElement]);

  // Handle volume changes
  useEffect(() => {
    if (!videoElement) return;
    videoElement.volume = video.volume;
    videoElement.muted = video.muted;
  }, [video.volume, video.muted, videoElement]);

  // Handle seeking
  useEffect(() => {
    if (!videoElement) return;

    // Only seek if the difference is significant to avoid loops
    // Increased threshold to prevent interference with playback
    if (Math.abs(videoElement.currentTime - video.currentTime) > 2) {
      videoElement.currentTime = video.currentTime;
    }
  }, [video.currentTime, videoElement]);

  // Handle loop property changes
  useEffect(() => {
    if (!videoElement) return;
    videoElement.loop = !!video.isLooping;
  }, [video.isLooping, videoElement]);

  // Note: Videos should continue playing even when not selected
  // This allows multiple videos to loop simultaneously on the canvas

  // Handle transformer
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      // Only show transformer if this is the only selected item or if clicking on it
      if (selectedIds.length === 1) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer()?.batchDraw();
      } else {
        trRef.current.nodes([]);
      }
    }
  }, [isSelected, selectedIds.length]);

  // Determine what to display - always use the video element
  // When playing: shows current frame
  // When paused: shows first frame (currentTime = 0)
  const displayElement: CanvasImageSource | undefined = undefined;

  // Handle keyboard shortcuts for video playback
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;

      // Don't handle shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      // Prevent default actions for these keys
      if (
        [
          "Space",
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "m",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }

      switch (e.code) {
        case "Space": // Play/pause
          onChange({ isPlaying: !video.isPlaying });
          break;
        case "ArrowLeft": // Seek backward
          onChange({
            currentTime: Math.max(0, video.currentTime - (e.shiftKey ? 10 : 5)),
          });
          break;
        case "ArrowRight": // Seek forward
          onChange({
            currentTime: Math.min(
              video.duration,
              video.currentTime + (e.shiftKey ? 10 : 5)
            ),
          });
          break;
        case "ArrowUp": // Volume up
          if (!video.muted) {
            onChange({ volume: Math.min(1, video.volume + 0.1) });
          }
          break;
        case "ArrowDown": // Volume down
          if (!video.muted) {
            onChange({ volume: Math.max(0, video.volume - 0.1) });
          }
          break;
        case "KeyM": // Mute/unmute
          onChange({ muted: !video.muted });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isSelected,
    video.isPlaying,
    video.currentTime,
    video.duration,
    video.volume,
    video.muted,
    onChange,
  ]);

  // Create RAF-throttled state update function for smoother dragging
  const throttledStateUpdate = useMemo(
    () =>
      throttleRAF(
        (
          snapped: { x: number; y: number },
          isMultiSelect: boolean,
          startPos?: { x: number; y: number }
        ) => {
          if (isMultiSelect && startPos) {
            const deltaX = snapped.x - startPos.x;
            const deltaY = snapped.y - startPos.y;

            // Batch update all selected items
            setVideos((prev) =>
              prev.map((vid) => {
                if (vid.id === video.id) {
                  return {
                    ...vid,
                    x: snapped.x,
                    y: snapped.y,
                    isVideo: true as const,
                  };
                } else if (selectedIds.includes(vid.id)) {
                  const vidStartPos = dragStartPositions.get(vid.id);
                  if (vidStartPos) {
                    return {
                      ...vid,
                      x: vidStartPos.x + deltaX,
                      y: vidStartPos.y + deltaY,
                      isVideo: true as const,
                    };
                  }
                }
                return vid;
              })
            );
          } else {
            onChange({
              x: snapped.x,
              y: snapped.y,
            });
          }
        }
      ),
    [selectedIds, video.id, dragStartPositions, setVideos, onChange]
  );

  // Handle drag move with snap-to-grid
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const nodeX = node.x();
      const nodeY = node.y();

      // Snap to grid
      const snapped = snapPosition(nodeX, nodeY);

      // Always constrain visual position to grid
      node.x(snapped.x);
      node.y(snapped.y);

      // Only update state when snap position actually changes
      const hasPositionChanged =
        !lastSnapPos.current ||
        lastSnapPos.current.x !== snapped.x ||
        lastSnapPos.current.y !== snapped.y;

      if (!hasPositionChanged) {
        return; // Skip state updates if still in same grid cell
      }

      // Trigger haptic feedback on position change
      if (lastSnapPos.current) {
        triggerSnapHaptic();
      }
      lastSnapPos.current = snapped;

      // Throttled state update
      const isMultiSelect =
        selectedIds.includes(video.id) && selectedIds.length > 1;
      const startPos = isMultiSelect
        ? dragStartPositions.get(video.id)
        : undefined;

      throttledStateUpdate(snapped, isMultiSelect, startPos);
    },
    [selectedIds, video.id, dragStartPositions, throttledStateUpdate]
  );

  return (
    <>
      <KonvaImage
        ref={shapeRef}
        image={displayElement}
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
        onDragMove={handleDragMove}
        onDragEnd={() => {
          // Reset snap tracking on drag end
          lastSnapPos.current = null;
          onDragEnd();
        }}
        onTransformStart={() => {
          setIsResizing(true);
          if (onResizeStart) {
            onResizeStart();
          }
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (node) {
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            onChange({
              x: node.x(),
              y: node.y(),
              width: Math.max(5, node.width() * scaleX),
              height: Math.max(5, node.height() * scaleY),
              rotation: node.rotation(),
            });
          }
          setIsResizing(false);
          if (onResizeEnd) {
            onResizeEnd();
          }
          onDragEnd();
        }}
        opacity={video.isGenerating ? 0.9 : 1}
        stroke={isSelected ? "#3b82f6" : isHovered ? "#3b82f6" : "transparent"}
        strokeWidth={isSelected || isHovered ? 2 : 0}
      />

      {isSelected && selectedIds.length === 1 && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};
