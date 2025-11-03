/**
 * Directive label component for canvas images
 *
 * Renders a centered text label overlay displaying camera angle or director information
 * on canvas images with uppercase text formatting.
 *
 * @module components/canvas/DirectiveLabel
 */

import { DIRECTOR_LABEL } from "@/constants/canvas";
import React from "react";
import { Text } from "react-konva";

/**
 * Props for DirectiveLabel component
 */
interface DirectiveLabelProps {
  /** Height of the parent image */
  height: number;
  /** Label text to display (will be transformed to uppercase) */
  labelText: string;
  /** Width of the parent image */
  width: number;
  /** X position of the parent image */
  x: number;
  /** Y position of the parent image */
  y: number;
}

/**
 * DirectiveLabel - Renders a centered label overlay with camera angle or director information
 *
 * The label is automatically centered within the parent image bounds and displays
 * the text in uppercase for consistent visual presentation.
 *
 * @component
 */
export const DirectiveLabel: React.FC<DirectiveLabelProps> = ({
  height,
  labelText,
  width,
  x,
  y,
}) => {
  const uppercaseText = labelText.toUpperCase();

  // Calculate text dimensions for background sizing
  const backgroundWidth = uppercaseText.length * DIRECTOR_LABEL.FONT_SIZE;
  const backgroundHeight = DIRECTOR_LABEL.FONT_SIZE;

  // Center the label in the image
  const labelX = x + width / 2 - backgroundWidth / 2;
  const labelY = y + height / 2 - backgroundHeight / 2;

  return (
    <Text
      align="center"
      fill={DIRECTOR_LABEL.TEXT_COLOR}
      fontSize={DIRECTOR_LABEL.FONT_SIZE}
      height={backgroundHeight}
      listening={false}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      text={uppercaseText}
      verticalAlign="middle"
      width={backgroundWidth}
      x={labelX}
      y={labelY}
    />
  );
};
