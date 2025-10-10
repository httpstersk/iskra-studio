/**
 * Generation state hook using Jotai
 * Manages AI generation state and tracks completion
 */

import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  activeGenerationsAtom,
  activeVideoGenerationsAtom,
  generationSettingsAtom,
  isConvertingToVideoAtom,
  isExtendingVideoAtom,
  isGeneratingAtom,
  isIsolatingAtom,
  isRemovingVideoBackgroundAtom,
  isTransformingVideoAtom,
  previousGenerationCountAtom,
  previousStyleIdAtom,
  showSuccessAtom,
} from "@/store/generation-atoms";

/**
 * Hook to manage generation state using Jotai atoms
 * Tracks generation progress and shows success indicators
 */
export function useGenerationState() {
  const [activeGenerations, setActiveGenerations] = useAtom(
    activeGenerationsAtom
  );
  const [activeVideoGenerations, setActiveVideoGenerations] = useAtom(
    activeVideoGenerationsAtom
  );
  const [generationSettings, setGenerationSettings] = useAtom(
    generationSettingsAtom
  );
  const [isConvertingToVideo, setIsConvertingToVideo] = useAtom(
    isConvertingToVideoAtom
  );
  const [isExtendingVideo, setIsExtendingVideo] = useAtom(
    isExtendingVideoAtom
  );
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [isIsolating, setIsIsolating] = useAtom(isIsolatingAtom);
  const [isRemovingVideoBackground, setIsRemovingVideoBackground] = useAtom(
    isRemovingVideoBackgroundAtom
  );
  const [isTransformingVideo, setIsTransformingVideo] = useAtom(
    isTransformingVideoAtom
  );
  const [previousGenerationCount, setPreviousGenerationCount] = useAtom(
    previousGenerationCountAtom
  );
  const [previousStyleId, setPreviousStyleId] = useAtom(previousStyleIdAtom);
  const [showSuccess, setShowSuccess] = useAtom(showSuccessAtom);

  // Track when generation completes
  useEffect(() => {
    const currentCount =
      activeGenerations.size +
      activeVideoGenerations.size +
      (isGenerating ? 1 : 0) +
      (isRemovingVideoBackground ? 1 : 0) +
      (isIsolating ? 1 : 0) +
      (isExtendingVideo ? 1 : 0) +
      (isTransformingVideo ? 1 : 0);

    if (previousGenerationCount > 0 && currentCount === 0) {
      setShowSuccess(true);
      const timeout = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    setPreviousGenerationCount(currentCount);
  }, [
    activeGenerations.size,
    activeVideoGenerations.size,
    isExtendingVideo,
    isGenerating,
    isIsolating,
    isRemovingVideoBackground,
    isTransformingVideo,
    previousGenerationCount,
    setPreviousGenerationCount,
    setShowSuccess,
  ]);

  // Track previous style when changing styles
  useEffect(() => {
    const currentStyleId = generationSettings.styleId;
    if (
      currentStyleId &&
      currentStyleId !== "custom" &&
      currentStyleId !== previousStyleId
    ) {
      setPreviousStyleId(currentStyleId);
    }
  }, [generationSettings.styleId, previousStyleId, setPreviousStyleId]);

  return {
    activeGenerations,
    activeVideoGenerations,
    generationSettings,
    isConvertingToVideo,
    isExtendingVideo,
    isGenerating,
    isIsolating,
    isRemovingVideoBackground,
    isTransformingVideo,
    previousStyleId,
    setActiveGenerations,
    setActiveVideoGenerations,
    setGenerationSettings,
    setIsConvertingToVideo,
    setIsExtendingVideo,
    setIsGenerating,
    setIsIsolating,
    setIsRemovingVideoBackground,
    setIsTransformingVideo,
    setPreviousStyleId,
    showSuccess,
  };
}
