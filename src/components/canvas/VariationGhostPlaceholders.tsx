import { useImageCache } from "@/hooks/useImageCache";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import type { PlacedImage } from "@/types/canvas";
import { createBlurredCloneCanvas } from "@/utils/glsl-blur";
import { snapPosition } from "@/utils/snap-utils";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";

const BLUR_SIGMA = 20;

interface VariationGhostPlaceholdersProps {
  selectedImage: PlacedImage;
  stageRef: React.RefObject<Konva.Stage | null>;
  isDragging: boolean;
  variationMode?: "image" | "video";
  generationCount?: number;
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 * Shows 4, 8, or 12 placeholders for image mode, 4 for video mode
 * Positioned clockwise starting from top center
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({
  selectedImage,
  variationMode: _variationMode = "image",
  generationCount = 4,
  stageRef,
  isDragging,
}) => {
    const nodeRef = useRef<Konva.Node | null>(null);
    const [anchor, setAnchor] = useState(() =>
      snapPosition(selectedImage.x, selectedImage.y),
    );
    const [blurredClone, setBlurredClone] = useState<HTMLCanvasElement | null>(
      null,
    );
    const [sourceImage] = useImageCache(selectedImage.src, "anonymous");

    // Track generation count changes to trigger animations
    const [transitionKey, setTransitionKey] = useState(0);
    const [placeholderOpacities, setPlaceholderOpacities] = useState<number[]>([]);
    const [pulseOpacity, setPulseOpacity] = useState(0);
    const [badgeScale, setBadgeScale] = useState(1);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
      nodeRef.current = stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
    }, [stageRef, selectedImage.id]);

    // Trigger animation when generation count changes
    useEffect(() => {
      setTransitionKey(prev => prev + 1);

      // Animate badge scale
      setBadgeScale(1.3);
      const badgeTimeout = setTimeout(() => setBadgeScale(1), 200);

      // Animate pulse effect on reference image
      let pulseStart: number | null = null;
      const pulseDuration = 400;

      const animatePulse = (timestamp: number) => {
        if (pulseStart === null) pulseStart = timestamp;
        const elapsed = timestamp - pulseStart;
        const progress = Math.min(elapsed / pulseDuration, 1);

        // Fade out pulse
        const opacity = 0.4 * (1 - progress);
        setPulseOpacity(opacity);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animatePulse);
        } else {
          setPulseOpacity(0);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animatePulse);

      return () => {
        clearTimeout(badgeTimeout);
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [generationCount]);

    useEffect(() => {
      if (!isDragging) {
        setAnchor(snapPosition(selectedImage.x, selectedImage.y));
        return;
      }

      // Cache the node reference once at the start of dragging
      if (!nodeRef.current) {
        nodeRef.current =
          stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
      }

      let frameId: number | undefined;
      let lastX = -Infinity;
      let lastY = -Infinity;

      const updatePosition = () => {
        const node = nodeRef.current;
        if (node) {
          const x = node.x();
          const y = node.y();

          // Only snap and update if position actually changed
          if (x !== lastX || y !== lastY) {
            lastX = x;
            lastY = y;
            const snapped = snapPosition(x, y);
            setAnchor((prev) =>
              prev.x === snapped.x && prev.y === snapped.y ? prev : snapped,
            );
          }
        }

        frameId = requestAnimationFrame(updatePosition);
      };

      frameId = requestAnimationFrame(updatePosition);

      return () => {
        if (frameId !== undefined) {
          cancelAnimationFrame(frameId);
        }
        nodeRef.current = null;
      };
    }, [
      isDragging,
      stageRef,
      selectedImage.id,
      selectedImage.x,
      selectedImage.y,
    ]);

    useEffect(() => {
      if (!sourceImage || selectedImage.width <= 0 || selectedImage.height <= 0) {
        setBlurredClone(null);
        return;
      }

      let cancelled = false;

      const canvas = createBlurredCloneCanvas(
        sourceImage,
        selectedImage.width,
        selectedImage.height,
        BLUR_SIGMA,
      );

      if (!cancelled) {
        setBlurredClone(canvas);
      }

      return () => {
        cancelled = true;
      };
    }, [sourceImage, selectedImage.width, selectedImage.height]);

    // Animate ghost placeholder opacity with stagger effect
    useEffect(() => {
      let positionIndices: number[];

      if (generationCount === 4) {
        positionIndices = [0, 2, 4, 6];
      } else if (generationCount === 8) {
        positionIndices = [0, 1, 2, 3, 4, 5, 6, 7];
      } else {
        positionIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      }

      // Initialize all to 0
      setPlaceholderOpacities(new Array(positionIndices.length).fill(0));

      let startTime: number | null = null;
      const animationDuration = 300; // Total animation duration
      const staggerDelay = 30; // Delay between each placeholder

      const animate = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;

        const newOpacities = positionIndices.map((_, i) => {
          const itemStartTime = i * staggerDelay;
          const itemElapsed = elapsed - itemStartTime;

          if (itemElapsed < 0) return 0;

          const itemProgress = Math.min(itemElapsed / animationDuration, 1);
          // Ease-out cubic for smooth deceleration
          return 1 - Math.pow(1 - itemProgress, 3);
        });

        setPlaceholderOpacities(newOpacities);

        // Continue animation until all placeholders are fully visible
        if (elapsed < animationDuration + (positionIndices.length - 1) * staggerDelay) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Ensure all are set to 1 at the end
          setPlaceholderOpacities(new Array(positionIndices.length).fill(1));
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [transitionKey, generationCount]);

    // Determine position indices based on generation count
    // 4 variations: indices 0, 2, 4, 6 (top, right, bottom, left - cardinal directions)
    // 8 variations: all indices 0-7 (sides + corners)
    // 12 variations: indices 0-7 (inner ring) + 8-11 (outer cardinal directions)
    let positionIndices: number[];

    if (generationCount === 4) {
      positionIndices = [0, 2, 4, 6];
    } else if (generationCount === 8) {
      positionIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    } else {
      // 12 variations: 8 inner positions + 4 outer cardinal directions
      positionIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }

    const ghostPlaceholders = positionIndices.map((positionIndex, i) => {
      // Calculate position based on snapped source position
      const position = calculateBalancedPosition(
        anchor.x,
        anchor.y,
        positionIndex,
        selectedImage.width,
        selectedImage.height,
        selectedImage.width,
        selectedImage.height,
      );

      return {
        id: `ghost-${i}`,
        x: position.x,
        y: position.y,
        width: selectedImage.width,
        height: selectedImage.height,
      };
    });

    // Calculate badge position (top-left corner of reference image)
    const badgeX = anchor.x - 20;
    const badgeY = anchor.y - 20;

    return (
      <Group listening={false}>
        {/* Pulse effect on reference image */}
        {pulseOpacity > 0 && (
          <Rect
            fill="rgba(59, 130, 246, 0.3)"
            height={selectedImage.height}
            listening={false}
            opacity={pulseOpacity}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            width={selectedImage.width}
            x={anchor.x}
            y={anchor.y}
          />
        )}

        {/* Animated ghost placeholders */}
        {ghostPlaceholders.map((ghost, i) => {
          const opacity = placeholderOpacities[i] ?? 0;
          const scale = 0.85 + (opacity * 0.15); // Scale from 0.85 to 1.0

          // Calculate scaled dimensions and positions for animation
          const scaledWidth = ghost.width * scale;
          const scaledHeight = ghost.height * scale;
          const offsetX = (ghost.width - scaledWidth) / 2;
          const offsetY = (ghost.height - scaledHeight) / 2;

          return (
            <Group key={`${ghost.id}-${transitionKey}`} listening={false}>
              {blurredClone ? (
                <KonvaImage
                  height={scaledHeight}
                  image={blurredClone}
                  listening={false}
                  opacity={0.75 * opacity}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                  width={scaledWidth}
                  x={ghost.x + offsetX}
                  y={ghost.y + offsetY}
                />
              ) : (
                <Rect
                  fill="rgba(15, 23, 42, 0.45)"
                  height={scaledHeight}
                  listening={false}
                  opacity={opacity}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                  width={scaledWidth}
                  x={ghost.x + offsetX}
                  y={ghost.y + offsetY}
                />
              )}
              <Rect
                height={scaledHeight}
                listening={false}
                opacity={0.25 * opacity}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                stroke="white"
                strokeWidth={1}
                width={scaledWidth}
                x={ghost.x + offsetX}
                y={ghost.y + offsetY}
              />
              <Text
                align="center"
                fill="#fff"
                fontSize={12}
                height={scaledHeight}
                listening={false}
                opacity={0.8 * opacity}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                text={(i + 1).toString()}
                verticalAlign="middle"
                width={scaledWidth}
                x={ghost.x + offsetX}
                y={ghost.y + offsetY}
              />
            </Group>
          );
        })}

        {/* Hint text on reference image when showing 4 or 8 variations */}
        {(generationCount === 4 || generationCount === 8) && (
          <Text
            align="center"
            fill="#ffffff"
            fontSize={10}
            fontStyle="500"
            height={selectedImage.height}
            listening={false}
            opacity={1}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            text="Double click for more variations"
            verticalAlign="middle"
            width={selectedImage.width}
            x={anchor.x}
            y={anchor.y}
          />
        )}
      </Group>
    );
  };
