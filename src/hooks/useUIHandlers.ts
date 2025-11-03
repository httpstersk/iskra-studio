import { useCallback } from "react";

/**
 * UI handler dependencies
 */
interface UIHandlerDeps {
  generationCount: number;
  selectedIds: string[];
  setGenerationCount: (count: number) => void;
  setVariationMode: (mode: "image" | "video") => void;
  variationMode: "image" | "video";
}

/**
 * Custom hook for managing UI interaction handlers
 *
 * Encapsulates logic for:
 * - Image double-click (generation count cycling)
 * - Variation mode changes
 *
 * @param deps - UI handler dependencies
 * @returns UI handler functions
 */
export function useUIHandlers(deps: UIHandlerDeps) {
  const {
    generationCount,
    selectedIds,
    setGenerationCount,
    setVariationMode,
    variationMode,
  } = deps;

  /**
   * Handles image double-click to cycle generation count (4 → 8 → 12 → 4)
   */
  const handleImageDoubleClick = useCallback(
    (imageId: string) => {
      if (selectedIds.includes(imageId) && variationMode === "image") {
        const currentCount = generationCount;
        let newCount: number;

        if (currentCount === 4) {
          newCount = 8;
        } else if (currentCount === 8) {
          newCount = 12;
        } else {
          newCount = 4;
        }

        setGenerationCount(newCount);
      }
    },
    [generationCount, selectedIds, setGenerationCount, variationMode],
  );

  /**
   * Handles variation mode change and resets count for video mode
   */
  const handleVariationModeChange = useCallback(
    (mode: "image" | "video") => {
      setVariationMode(mode);
      if (mode === "video") {
        setGenerationCount(4);
      }
    },
    [setGenerationCount, setVariationMode],
  );

  return {
    handleImageDoubleClick,
    handleVariationModeChange,
  };
}
