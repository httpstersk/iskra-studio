import type { PlacedVideo } from "@/types/canvas";
import React, { useCallback, useRef, useState } from "react";
import { Group, Rect, Text, Shape } from "react-konva";
import type Konva from "konva";

interface KonvaVideoControlsProps {
  video: PlacedVideo;
  onChange: (newAttrs: Partial<PlacedVideo>) => void;
  isSelected: boolean;
}

const CONTROLS_HEIGHT = 32;
const CONTROLS_PADDING = 8;
const PLAY_BUTTON_SIZE = 24;
const TIMELINE_HEIGHT = 4;
const TIME_FONT_SIZE = 10;

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
  const timelineWidth = controlsWidth - PLAY_BUTTON_SIZE - CONTROLS_PADDING * 3;
  const timelineX = PLAY_BUTTON_SIZE + CONTROLS_PADDING * 2;

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
    [onChange, timelineWidth, video.duration]
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
    [onChange, timelineWidth, video.duration]
  );

  const handleTimelineDragEnd = useCallback(() => {
    setIsDraggingTimeline(false);
  }, []);

  const progressPercentage = video.duration > 0 ? video.currentTime / video.duration : 0;

  if (!isSelected) return null;

  return (
    <Group
      y={video.height - CONTROLS_HEIGHT - CONTROLS_PADDING}
      x={CONTROLS_PADDING}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Controls background */}
      <Rect
        width={controlsWidth}
        height={CONTROLS_HEIGHT}
        fill="rgba(0, 0, 0, 0.8)"
        cornerRadius={6}
        shadowColor="black"
        shadowBlur={10}
        shadowOpacity={0.5}
      />

      {/* Play/Pause button background */}
      <Rect
        x={CONTROLS_PADDING}
        y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
        width={PLAY_BUTTON_SIZE}
        height={PLAY_BUTTON_SIZE}
        fill={isHovering ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.1)"}
        cornerRadius={4}
        onClick={handlePlayPauseClick}
        onTap={handlePlayPauseClick}
      />

      {/* Play/Pause icon */}
      {video.isPlaying ? (
        // Pause icon (two bars)
        <Group
          x={CONTROLS_PADDING}
          y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
          onClick={handlePlayPauseClick}
          onTap={handlePlayPauseClick}
        >
          <Rect
            x={PLAY_BUTTON_SIZE / 2 - 5}
            y={6}
            width={3}
            height={12}
            fill="white"
          />
          <Rect
            x={PLAY_BUTTON_SIZE / 2 + 2}
            y={6}
            width={3}
            height={12}
            fill="white"
          />
        </Group>
      ) : (
        // Play icon (triangle)
        <Shape
          x={CONTROLS_PADDING}
          y={CONTROLS_HEIGHT / 2 - PLAY_BUTTON_SIZE / 2}
          sceneFunc={(context, shape) => {
            context.beginPath();
            context.moveTo(PLAY_BUTTON_SIZE / 2 - 2, 6);
            context.lineTo(PLAY_BUTTON_SIZE / 2 - 2, 18);
            context.lineTo(PLAY_BUTTON_SIZE / 2 + 6, 12);
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill="white"
          onClick={handlePlayPauseClick}
          onTap={handlePlayPauseClick}
        />
      )}

      {/* Timeline background */}
      <Rect
        ref={timelineRef}
        x={timelineX}
        y={CONTROLS_HEIGHT / 2 - TIMELINE_HEIGHT / 2}
        width={timelineWidth}
        height={TIMELINE_HEIGHT}
        fill="rgba(255, 255, 255, 0.3)"
        cornerRadius={2}
        onClick={handleTimelineClick}
        onTap={handleTimelineClick}
        onMouseDown={handleTimelineDragStart}
        onMouseMove={isDraggingTimeline ? handleTimelineDragMove : undefined}
        onMouseUp={handleTimelineDragEnd}
      />

      {/* Timeline progress */}
      <Rect
        x={timelineX}
        y={CONTROLS_HEIGHT / 2 - TIMELINE_HEIGHT / 2}
        width={timelineWidth * progressPercentage}
        height={TIMELINE_HEIGHT}
        fill="white"
        cornerRadius={2}
        listening={false}
      />

      {/* Time display */}
      <Text
        x={timelineX}
        y={CONTROLS_HEIGHT / 2 + TIMELINE_HEIGHT / 2 + 2}
        text={`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`}
        fontSize={TIME_FONT_SIZE}
        fill="rgba(255, 255, 255, 0.8)"
        listening={false}
      />
    </Group>
  );
};
