/**
 * Generation state hook using Jotai
 * Manages AI generation state and tracks completion
 */

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  activeGenerationsAtom,
  activeVideoGenerationsAtom,
  generationSettingsAtom,
  isConvertingToVideoAtom,
  isGeneratingAtom,
  previousGenerationCountAtom,
  previousStyleIdAtom,
  showSuccessAtom,
  videoModelAtom,
  videoDurationAtom,
  videoResolutionAtom,
} from "@/store/generation-atoms";

/**
 * Hook to manage generation state using Jotai atoms
 * Tracks generation progress and shows success indicators
 */
export function useGenerationState() {
  const [activeGenerations, setActiveGenerations] = useAtom(
    activeGenerationsAtom,
  );
  const [activeVideoGenerations, setActiveVideoGenerations] = useAtom(
    activeVideoGenerationsAtom,
  );
  const [generationSettings, setGenerationSettings] = useAtom(
    generationSettingsAtom,
  );
  const [isConvertingToVideo, setIsConvertingToVideo] = useAtom(
    isConvertingToVideoAtom,
  );
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [previousGenerationCount, setPreviousGenerationCount] = useAtom(
    previousGenerationCountAtom,
  );
  const [previousStyleId, setPreviousStyleId] = useAtom(previousStyleIdAtom);
  const [showSuccess, setShowSuccess] = useAtom(showSuccessAtom);
  const [videoModel, setVideoModel] = useAtom(videoModelAtom);
  const [videoDuration, setVideoDuration] = useAtom(videoDurationAtom);
  const [videoResolution, setVideoResolution] = useAtom(videoResolutionAtom);

  // Track when generation completes
  useEffect(() => {
    const currentCount =
      activeGenerations.size +
      activeVideoGenerations.size +
      (isGenerating ? 1 : 0);

    if (previousGenerationCount > 0 && currentCount === 0) {
      setShowSuccess(true);
      // Use requestIdleCallback for non-critical success indicator to avoid blocking generation completion
      const timeout = requestIdleCallback(
        () => {
          setShowSuccess(false);
        },
        { timeout: 2000 },
      );
      return () => cancelIdleCallback(timeout);
    }

    setPreviousGenerationCount(currentCount);
  }, [
    activeGenerations.size,
    activeVideoGenerations.size,
    isGenerating,
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
    isGenerating,
    previousStyleId,
    setActiveGenerations,
    setActiveVideoGenerations,
    setGenerationSettings,
    setIsConvertingToVideo,
    setIsGenerating,
    setPreviousStyleId,
    setVideoDuration,
    setVideoModel,
    setVideoResolution,
    showSuccess,
    videoDuration,
    videoModel,
    videoResolution,
  };
}
