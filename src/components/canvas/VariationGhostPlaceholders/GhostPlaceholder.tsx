import {
    GHOST_PLACEHOLDER_ANIMATION,
    GHOST_PLACEHOLDER_ARIA,
    GHOST_PLACEHOLDER_STYLES,
} from "@/constants/ghost-placeholders";
import React, { useMemo } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";

/**
 * Props for the GhostPlaceholder component
 */
interface GhostPlaceholderProps {
    /** Blurred clone canvas for background, or null for fallback */
    blurredClone: HTMLCanvasElement | null;
    /** Height of the placeholder */
    height: number;
    /** Index of the placeholder (used for numbering) */
    index: number;
    /** Opacity value (0-1) for animation */
    opacity: number;
    /** Transition key to force re-render on animation restart */
    transitionKey: number;
    /** Width of the placeholder */
    width: number;
    /** X position */
    x: number;
    /** Y position */
    y: number;
}

/**
 * Renders a single ghost placeholder with animation
 * 
 * Shows a blurred clone of the source image (if available) or a fallback
 * rectangle, along with a numbered label and border. Animates from a smaller
 * scale to full size based on the opacity value.
 * 
 * Uses useMemo to avoid recalculating scaled dimensions on every render.
 * 
 * @param props - Component props
 * @returns Konva Group element containing the placeholder visualization
 */
export const GhostPlaceholder: React.FC<GhostPlaceholderProps> = ({
    blurredClone,
    height,
    index,
    opacity,
    transitionKey,
    width,
    x,
    y,
}) => {
    // Calculate scaled dimensions and positions for animation
    const scaledDimensions = useMemo(() => {
        const scale =
            GHOST_PLACEHOLDER_ANIMATION.PLACEHOLDER_SCALE_MIN +
            opacity *
            (GHOST_PLACEHOLDER_ANIMATION.PLACEHOLDER_SCALE_MAX -
                GHOST_PLACEHOLDER_ANIMATION.PLACEHOLDER_SCALE_MIN);
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        const offsetX = (width - scaledWidth) / 2;
        const offsetY = (height - scaledHeight) / 2;

        return {
            offsetX,
            offsetY,
            scale,
            scaledHeight,
            scaledWidth,
        };
    }, [opacity, width, height]);

    const { offsetX, offsetY, scaledHeight, scaledWidth } = scaledDimensions;

    return (
        <Group
            aria-label={GHOST_PLACEHOLDER_ARIA.PLACEHOLDER(index)}
            key={`ghost-${index}-${transitionKey}`}
            listening={false}
        >
            {blurredClone ? (
                <KonvaImage
                    height={scaledHeight}
                    image={blurredClone}
                    listening={false}
                    opacity={GHOST_PLACEHOLDER_STYLES.OPACITY_BLURRED_CLONE * opacity}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                    width={scaledWidth}
                    x={x + offsetX}
                    y={y + offsetY}
                />
            ) : (
                <Rect
                    fill={GHOST_PLACEHOLDER_STYLES.FALLBACK_BACKGROUND}
                    height={scaledHeight}
                    listening={false}
                    opacity={opacity}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                    width={scaledWidth}
                    x={x + offsetX}
                    y={y + offsetY}
                />
            )}
            <Rect
                height={scaledHeight}
                listening={false}
                opacity={GHOST_PLACEHOLDER_STYLES.OPACITY_BORDER * opacity}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                stroke={GHOST_PLACEHOLDER_STYLES.STROKE_COLOR}
                strokeWidth={GHOST_PLACEHOLDER_STYLES.STROKE_WIDTH}
                width={scaledWidth}
                x={x + offsetX}
                y={y + offsetY}
            />
            <Text
                align="center"
                fill={GHOST_PLACEHOLDER_STYLES.NUMBER_TEXT_COLOR}
                fontSize={GHOST_PLACEHOLDER_STYLES.NUMBER_TEXT_SIZE}
                height={scaledHeight}
                listening={false}
                opacity={GHOST_PLACEHOLDER_STYLES.OPACITY_NUMBER * opacity}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
                text={(index + 1).toString()}
                verticalAlign="middle"
                width={scaledWidth}
                x={x + offsetX}
                y={y + offsetY}
            />
        </Group>
    );
};

GhostPlaceholder.displayName = "GhostPlaceholder";
