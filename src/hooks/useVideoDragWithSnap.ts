/**
 * useVideoDragWithSnap
 *
 * Provides a snap-to-grid drag handler for single/multi-select video elements.
 * Uses requestAnimationFrame throttling and triggers haptic feedback on snap changes.
 */

import { useCallback, useMemo, useRef } from "react";
import type Konva from "konva";
import type { PlacedVideo } from "@/types/canvas";
import { throttleRAF } from "@/utils/performance";
import { snapPosition, triggerSnapHaptic } from "@/utils/snap-utils";

/**
 * Snap-to-grid drag handler for single and multi-select cases.
 * Returns a Konva dragMove handler and a reset function.
 */
export function useVideoDragWithSnap(
  params: {
    dragStartPositions: Map<string, { x: number; y: number }>;
    selectedIds: string[];
    selfId: string;
  },
  setAllVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>,
  onChangeSelf: (next: Partial<PlacedVideo>) => void,
) {
  const lastSnap = useRef<{ x: number; y: number } | null>(null);

  const throttledStateUpdate = useMemo(
    () =>
      throttleRAF(
        (
          snapped: { x: number; y: number },
          isMultiSelect: boolean,
          startPos?: { x: number; y: number },
        ) => {
          if (isMultiSelect && startPos) {
            const deltaX = snapped.x - startPos.x;
            const deltaY = snapped.y - startPos.y;
            setAllVideos((prev) =>
              prev.map((vid) => {
                if (vid.id === params.selfId) {
                  return { ...vid, x: snapped.x, y: snapped.y, isVideo: true as const };
                }
                if (params.selectedIds.includes(vid.id)) {
                  const p = params.dragStartPositions.get(vid.id);
                  if (p) {
                    return {
                      ...vid,
                      x: p.x + deltaX,
                      y: p.y + deltaY,
                      isVideo: true as const,
                    };
                  }
                }
                return vid;
              }),
            );
          } else {
            onChangeSelf({ x: snapped.x, y: snapped.y });
          }
        },
      ),
    [params.dragStartPositions, params.selectedIds, params.selfId, setAllVideos, onChangeSelf],
  );

  const onDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const snapped = snapPosition(node.x(), node.y());
      node.x(snapped.x);
      node.y(snapped.y);

      const changed =
        !lastSnap.current ||
        lastSnap.current.x !== snapped.x ||
        lastSnap.current.y !== snapped.y;
      if (!changed) return;

      if (lastSnap.current) triggerSnapHaptic();
      lastSnap.current = snapped;

      const isMulti =
        params.selectedIds.includes(params.selfId) && params.selectedIds.length > 1;
      const startPos = isMulti
        ? params.dragStartPositions.get(params.selfId)
        : undefined;

      throttledStateUpdate(snapped, isMulti, startPos);
    },
    [params.dragStartPositions, params.selectedIds, params.selfId, throttledStateUpdate],
  );

  const reset = useCallback(() => {
    lastSnap.current = null;
  }, []);

  return { onDragMove, reset } as const;
}
