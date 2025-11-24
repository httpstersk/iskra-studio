import { snapPosition } from "@/utils/snap-utils";
import type { PlacedImage } from "@/types/canvas";
import Konva from "konva";
import { useEffect, useRef, useState } from "react";

/**
 * Tracks snapped anchor position during drag operations
 * 
 * Uses requestAnimationFrame for performance and minimizes re-renders by only
 * updating state when the position actually changes. Caches node reference
 * during drag to avoid repeated DOM queries.
 * 
 * @param selectedImage - The currently selected image
 * @param stageRef - Reference to the Konva stage
 * @param isDragging - Whether the image is currently being dragged
 * @returns Snapped anchor position {x, y}
 */
export function useAnchorPosition(
    selectedImage: PlacedImage,
    stageRef: React.RefObject<Konva.Stage | null>,
    isDragging: boolean,
): { x: number; y: number } {
    const nodeRef = useRef<Konva.Node | null>(null);
    const [anchor, setAnchor] = useState(() =>
        snapPosition(selectedImage.x, selectedImage.y),
    );

    useEffect(() => {
        nodeRef.current = stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
    }, [stageRef, selectedImage.id]);

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

    return anchor;
}
