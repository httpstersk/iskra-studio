import type { PlacedVideo } from "@/types/canvas";
import React, { useCallback, useRef, useState } from "react";
import { Group, Rect, Text, Shape } from "react-konva";
import Konva from "konva";

interface KonvaVideoControlsProps {
  video: PlacedVideo;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  isSelected: boolean;
}

const CONTROLS_HEIGHT = 40;
const CONTROLS_PADDING = 8;
const PLAY_BUTTON_SIZE = 28;
const TIMELINE_HEIGHT = 6;
const TIME_FONT_SIZE = 11;
const TIME_WIDTH = 45;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const KonvaVideoControls: React.FC<KonvaVideoControlsProps> = ({
  video,
  onChange,
  isSelected,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const timelineRef = useRef<Konva.Rect>(null);

  const controlsWidth = video.width - CONTROLS_PADDING * 2;
  const playButtonX = CONTROLS_PADDING;
  const timelineX = playButtonX + PLAY_BUTTON_SIZE + CONTROLS_PADDING;
  const remainingTimeX = controlsWidth - TIME_WIDTH;
  const timelineWidth = remainingTimeX - timelineX - CONTROLS_PADDING;

  const handlePlayPauseClick = useCallback(() => {
    onChange({ isPlaying: !video.isPlaying });
  }, [onChange, video.isPlaying]);

  const handleTimelineClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!timelineRef.current) return;
      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const timelineNode = timelineRef.current;
      const timelinePos = timelineNode.getAbsolutePosition();
      const relativeX = pointerPos.x - timelinePos.x;
      const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth));
      const newTime = percentage * video.duration;

      onChange({ currentTime: newTime });
    },
    [onChange, timelineWidth, video.duration],
  );

  const handleTimelineDragStart = useCallback(() => {
    setIsDraggingTimeline(true);
  }, []);

  const handleTimelineDragMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!timelineRef.current) return;
      const stage = e.target.getStage();
      if (!stage) return;

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const timelineNode = timelineRef.current;
      const timelinePos = timelineNode.getAbsolutePosition();
      const relativeX = pointerPos.x - timelinePos.x;
      const percentage = Math.max(0, Math.min(1, relativeX / timelineWidth));
      const newTime = percentage * video.duration;

      onChange({ currentTime: newTime });
    },
    [onChange, timelineWidth, video.duration],
  );

  const handleTimelineDragEnd = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  const progressPercentage =
    video.duration > 0 ? video.currentTime / video.duration : 0;
  const remainingTime = video.duration - video.currentTime;

  if (!isSelected) return null;

  return (
    <Group
      y={video.height - CONTROLS_HEIGHT - CONTROLS_PADDING}
      x={CONTROLS_PADDING}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Backdrop blur layer */}
      <Rect
        width={controlsWidth}
        height={CONTROLS_HEIGHT}
        fill="rgba(255, 255, 255, 0.15)"
        cornerRadius={8}
        filters={[Konva.Filters.Blur]}
        blurRadius={20}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Controls background */}
      <Rect
        width={controlsWidth}
        height={CONTROLS_HEIGHT}
        fill="rgba(0, 0, 0, 0.5)"
        cornerRadius={8}
        shadowColor="rgba(0, 0, 0, 0.25)"
        shadowBlur={20}
        shadowOffsetY={2}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Play/Pause button background */}
      <Rect
        x={playButtonX}
        y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
        width={PLAY_BUTTON_SIZE}
        height={PLAY_BUTTON_SIZE}
        fill={
          isHovering ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)"
        }
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth={1}
        cornerRadius={100}
        onClick={handlePlayPauseClick}
        onTap={handlePlayPauseClick}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />

      {/* Play/Pause icon */}
      {video.isPlaying ? (
        // Pause icon (two bars)
        <Group
          x={playButtonX}
          y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
          onClick={handlePlayPauseClick}
          onTap={handlePlayPauseClick}
        >
          <Rect
            x={PLAY_BUTTON_SIZE / 2 - 5}
            y={7}
            width={3.5}
            height={14}
            fill="white"
            cornerRadius={1}
            listening={false}
            perfectDrawEnabled={false}
          />
          <Rect
            x={PLAY_BUTTON_SIZE / 2 + 1.5}
            y={7}
            width={3.5}
            height={14}
            fill="white"
            cornerRadius={1}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      ) : (
        // Play icon (triangle) - optically centered
        <Shape
          x={playButtonX - 3}
          y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
          sceneFunc={(context, shape) => {
            context.beginPath();
            // Shift right by 1px for optical centering
            context.moveTo(PLAY_BUTTON_SIZE / 2, 7);
            context.lineTo(PLAY_BUTTON_SIZE / 2, 21);
            context.lineTo(PLAY_BUTTON_SIZE / 2 + 9, 14);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill="white"
          onClick={handlePlayPauseClick}
          onTap={handlePlayPauseClick}
          perfectDrawEnabled={false}
        />
      )}

      {/* Timeline background */}
      <Rect
        ref={timelineRef}
        x={timelineX}
        y={CONTROLS_HEIGHT / 2 - TIMELINE_HEIGHT / 2}
        width={timelineWidth}
        height={TIMELINE_HEIGHT}
        fill="rgba(255, 255, 255, 0.25)"
        cornerRadius={3}
        onClick={handleTimelineClick}
        onTap={handleTimelineClick}
        onMouseDown={handleTimelineDragStart}
        onMouseMove={isDraggingTimeline ? handleTimelineDragMove : undefined}
        onMouseUp={handleTimelineDragEnd}
        perfectDrawEnabled={false}
      />

      {/* Timeline progress */}
      <Rect
        x={timelineX}
        y={CONTROLS_HEIGHT / 2 - TIMELINE_HEIGHT / 2}
        width={timelineWidth * progressPercentage}
        height={TIMELINE_HEIGHT}
        fill="white"
        cornerRadius={3}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Remaining time display */}
      <Text
        x={remainingTimeX}
        y={CONTROLS_HEIGHT / 2 - TIME_FONT_SIZE / 2}
        text={`-${formatTime(remainingTime)}`}
        fontSize={TIME_FONT_SIZE}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="rgba(255, 255, 255, 0.7)"
        fontStyle="500"
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
};
