import {
  GHOST_PLACEHOLDER_ARIA,
  GHOST_PLACEHOLDER_STYLES,
  GHOST_PLACEHOLDER_TEXT,
  POSITION_INDICES_MAP,
} from "@/constants/ghost-placeholders";
import { useAnchorPosition } from "@/hooks/useAnchorPosition";
import { useGhostPlaceholderAnimations } from "@/hooks/useGhostPlaceholderAnimations";
import { useImageCache } from "@/hooks/useImageCache";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import type { PlacedImage } from "@/types/canvas";
import { createBlurredCloneCanvas } from "@/utils/glsl-blur";
import Konva from "konva";
import React, { useEffect, useMemo, useState } from "react";
import { Group } from "react-konva";
import {
  GhostPlaceholder,
  HintText,
  PulseOverlay,
} from "./VariationGhostPlaceholders/index";

/**
 * Props for the VariationGhostPlaceholders component
 */
interface VariationGhostPlaceholdersProps {
  /** Number of variations to generate (4, 8, or 12) */
  generationCount?: number;
  /** Whether the image is currently being dragged */
  isDragging: boolean;
  /** The currently selected image */
  selectedImage: PlacedImage;
  /** Reference to the Konva stage */
  stageRef: React.RefObject<Konva.Stage | null>;
  /** Variation mode (image or video) */
  variationMode?: "image" | "video";
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 *
 * This component provides visual feedback when a single image is selected in
 * variation mode. It displays 4, 8, or 12 ghost placeholders positioned around
 * the selected image, showing where generated variations will appear.
 *
 * **Features:**
 * - Blurred clone backgrounds for realistic preview
 * - Staggered fade-in animations with scale effect
 * - Pulse effect on reference image when count changes
 * - Hint text for 4/8 variations prompting double-click
 * - Follows image during drag operations with snapping
 *
 * **Accessibility:**
 * - ARIA labels on main container and all interactive elements
 * - Semantic grouping of related elements
 *
 * **Compound Components:**
 * - `PulseOverlay` - Pulse animation on reference image
 * - `GhostPlaceholder` - Individual placeholder with animation
 * - `HintText` - Instructional text overlay
 *
 * @param props - Component props
 * @returns Konva Group element containing all ghost placeholders and effects
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({
  generationCount = 4,
  isDragging,
  selectedImage,
  stageRef,
  variationMode: _variationMode = "image",
}) => {
  const [blurredClone, setBlurredClone] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [sourceImage] = useImageCache(selectedImage.src, "anonymous");

  // Use custom hooks for position tracking and animations
  const anchor = useAnchorPosition(selectedImage, stageRef, isDragging);

  // Determine position indices based on generation count
  const positionIndices = useMemo(
    () => POSITION_INDICES_MAP[generationCount] ?? POSITION_INDICES_MAP[4],
    [generationCount],
  );

  const { badgeScale, placeholderOpacities, pulseOpacity, transitionKey } =
    useGhostPlaceholderAnimations(generationCount, positionIndices);

  // Create blurred clone canvas for ghost placeholder backgrounds
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
      GHOST_PLACEHOLDER_STYLES.SIGMA_BLUR,
    );

    if (!cancelled) {
      setBlurredClone(canvas);
    }

    return () => {
      cancelled = true;
    };
  }, [sourceImage, selectedImage.width, selectedImage.height]);

  // Calculate ghost placeholder positions
  const ghostPlaceholders = useMemo(
    () =>
      positionIndices.map((positionIndex, i) => {
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
          height: selectedImage.height,
          id: `ghost-${i}`,
          width: selectedImage.width,
          x: position.x,
          y: position.y,
        };
      }),
    [
      positionIndices,
      anchor.x,
      anchor.y,
      selectedImage.width,
      selectedImage.height,
    ],
  );

  return (
    <Group aria-label={GHOST_PLACEHOLDER_ARIA.CONTAINER} listening={false}>
      {/* Pulse effect on reference image */}
      <PulseOverlay
        height={selectedImage.height}
        opacity={pulseOpacity}
        width={selectedImage.width}
        x={anchor.x}
        y={anchor.y}
      />

      {/* Animated ghost placeholders */}
      {ghostPlaceholders.map((ghost, i) => (
        <GhostPlaceholder
          key={ghost.id}
          blurredClone={blurredClone}
          height={ghost.height}
          index={i}
          opacity={placeholderOpacities[i] ?? 0}
          transitionKey={transitionKey}
          width={ghost.width}
          x={ghost.x}
          y={ghost.y}
        />
      ))}

      {/* Hint text on reference image when showing 4 or 8 variations */}
      {(generationCount === 4 || generationCount === 8) && (
        <HintText
          height={selectedImage.height}
          text={GHOST_PLACEHOLDER_TEXT.HINT_DOUBLE_CLICK}
          width={selectedImage.width}
          x={anchor.x}
          y={anchor.y}
        />
      )}
    </Group>
  );
};

VariationGhostPlaceholders.displayName = "VariationGhostPlaceholders";
