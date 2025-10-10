import React from "react";
import type { PlacedImage } from "@/types/canvas";
import type { Viewport } from "@/hooks/useCanvasState";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import { ShimmeringText } from "@/components/ui/shimmering-text";

interface VariationNumbersOverlayProps {
  selectedImage: PlacedImage;
  viewport: Viewport;
  canvasSize: { width: number; height: number };
}

export const VariationNumbersOverlay: React.FC<
  VariationNumbersOverlayProps
> = ({ selectedImage, viewport, canvasSize }) => {
  const sourceCenterX = selectedImage.x + selectedImage.width / 2;
  const sourceCenterY = selectedImage.y + selectedImage.height / 2;

  const ghostPlaceholders = Array.from({ length: 4 }, (_, i) => {
    const { x, y } = calculateBalancedPosition(
      sourceCenterX,
      sourceCenterY,
      i,
      selectedImage.width,
      selectedImage.height,
      selectedImage.width,
      selectedImage.height
    );

    const screenX = x * viewport.scale + viewport.x;
    const screenY = y * viewport.scale + viewport.y;
    const screenWidth = selectedImage.width * viewport.scale;
    const screenHeight = selectedImage.height * viewport.scale;

    return {
      id: `ghost-number-${i}`,
      number: i < 9 ? `0${i + 1}` : i + 1,
      screenX,
      screenY,
      screenWidth,
      screenHeight,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0">
      {ghostPlaceholders.map(
        ({ id, screenHeight, screenWidth, screenX, screenY, number }) => {
          const fontSize = Math.min(screenWidth, screenHeight) * 0.4;

          return (
            <div
              key={id}
              className="absolute flex items-center justify-center"
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenWidth}px`,
                height: `${screenHeight}px`,
              }}
            >
              <ShimmeringText
                color="#555"
                className="text-2xl"
                duration={1}
                repeat={true}
                repeatDelay={0.5}
                shimmerColor="#ffffff"
                spread={4}
                startOnView
                text={number.toString()}
              />
            </div>
          );
        }
      )}
    </div>
  );
};
