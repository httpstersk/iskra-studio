import type { SelectionBox } from "@/types/canvas";
import React from "react";
import { Rect } from "react-konva";

interface SelectionBoxProps {
  selectionBox: SelectionBox;
}

export const SelectionBoxComponent: React.FC<SelectionBoxProps> = ({
  selectionBox,
}) => {
  if (!selectionBox.visible) {
    return null;
  }

  return (
    <Rect
      dash={[5, 5]}
      fill="rgba(59, 130, 246, 0.1)"
      height={Math.abs(selectionBox.endY - selectionBox.startY)}
      listening={false}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      stroke="rgb(59, 130, 246)"
      strokeWidth={1}
      width={Math.abs(selectionBox.endX - selectionBox.startX)}
      x={Math.min(selectionBox.startX, selectionBox.endX)}
      y={Math.min(selectionBox.startY, selectionBox.endY)}
    />
  );
};
