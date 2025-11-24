import { GHOST_PLACEHOLDER_STYLES } from "@/constants/ghost-placeholders";
import React from "react";
import { Rect } from "react-konva";

/**
 * Props for the PulseOverlay component
 */
interface PulseOverlayProps {
    /** Height of the overlay */
    height: number;
    /** Opacity value (0-1) */
    opacity: number;
    /** Width of the overlay */
    width: number;
    /** X position */
    x: number;
    /** Y position */
    y: number;
}

/**
 * Renders pulse animation overlay on reference image
 * 
 * Displays a brief blue pulse effect that fades out when the generation
 * count changes, providing visual feedback for the transition.
 * 
 * @param props - Component props
 * @returns Konva Rect element or null if opacity is 0
 */
export const PulseOverlay: React.FC<PulseOverlayProps> = ({
    height,
    opacity,
    width,
    x,
    y,
}) => {
    if (opacity <= 0) return null;

    return (
        <Rect
            fill={GHOST_PLACEHOLDER_STYLES.PULSE_COLOR}
            height={height}
            listening={false}
            opacity={opacity}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
            width={width}
            x={x}
            y={y}
        />
    );
};

PulseOverlay.displayName = "PulseOverlay";
