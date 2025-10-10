import { useState, useEffect } from "react";
import type {
  GenerationSettings,
  ActiveGeneration,
  ActiveVideoGeneration,
} from "@/types/canvas";
import { styleModels } from "@/lib/models";

export function useGenerationState() {
  const simpsonsStyle = styleModels.find((m) => m.id === "simpsons");

  const [generationSettings, setGenerationSettings] =
    useState<GenerationSettings>({
      prompt: simpsonsStyle?.prompt || "",
      loraUrl: simpsonsStyle?.loraUrl || "",
      styleId: simpsonsStyle?.id || "simpsons",
    });

  const [previousStyleId, setPreviousStyleId] = useState<string>(
    simpsonsStyle?.id || "simpsons"
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeGenerations, setActiveGenerations] = useState<
    Map<string, ActiveGeneration>
  >(new Map());
  const [activeVideoGenerations, setActiveVideoGenerations] = useState<
    Map<string, ActiveVideoGeneration>
  >(new Map());

  // Video-specific generation states
  const [isConvertingToVideo, setIsConvertingToVideo] = useState(false);
  const [isTransformingVideo, setIsTransformingVideo] = useState(false);
  const [isExtendingVideo, setIsExtendingVideo] = useState(false);
  const [isRemovingVideoBackground, setIsRemovingVideoBackground] =
    useState(false);
  const [isIsolating, setIsIsolating] = useState(false);

  // Success state for completion indicator
  const [previousGenerationCount, setPreviousGenerationCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

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
    isGenerating,
    isRemovingVideoBackground,
    isIsolating,
    isExtendingVideo,
    isTransformingVideo,
    previousGenerationCount,
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
  }, [generationSettings.styleId, previousStyleId]);

  return {
    generationSettings,
    setGenerationSettings,
    previousStyleId,
    setPreviousStyleId,
    isGenerating,
    setIsGenerating,
    activeGenerations,
    setActiveGenerations,
    activeVideoGenerations,
    setActiveVideoGenerations,
    isConvertingToVideo,
    setIsConvertingToVideo,
    isTransformingVideo,
    setIsTransformingVideo,
    isExtendingVideo,
    setIsExtendingVideo,
    isRemovingVideoBackground,
    setIsRemovingVideoBackground,
    isIsolating,
    setIsIsolating,
    showSuccess,
  };
}
