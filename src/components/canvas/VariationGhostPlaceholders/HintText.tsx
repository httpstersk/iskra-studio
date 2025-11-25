import {
  GHOST_PLACEHOLDER_ARIA,
  GHOST_PLACEHOLDER_TEXT,
} from "@/constants/ghost-placeholders";
import React from "react";
import { Text } from "react-konva";

/**
 * Props for the HintText component
 */
interface HintTextProps {
  /** Height of the text area */
  height: number;
  /** Text content to display */
  text: string;
  /** Width of the text area */
  width: number;
  /** X position */
  x: number;
  /** Y position */
  y: number;
}

/**
 * Renders hint text centered on reference image
 *
 * Displays instructional text over the selected image when showing
 * 4 or 8 variations, prompting user to double-click for more options.
 *
 * @param props - Component props
 * @returns Konva Text element
 */
export const HintText: React.FC<HintTextProps> = ({
  height,
  text,
  width,
  x,
  y,
}) => {
  return (
    <Text
      align="center"
      aria-label={GHOST_PLACEHOLDER_ARIA.HINT_TEXT}
      fill={GHOST_PLACEHOLDER_TEXT.HINT_TEXT_COLOR}
      fontSize={GHOST_PLACEHOLDER_TEXT.HINT_FONT_SIZE}
      fontStyle={GHOST_PLACEHOLDER_TEXT.HINT_FONT_STYLE}
      height={height}
      listening={false}
      opacity={1}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      text={text}
      verticalAlign="middle"
      width={width}
      x={x}
      y={y}
    />
  );
};

HintText.displayName = "HintText";
