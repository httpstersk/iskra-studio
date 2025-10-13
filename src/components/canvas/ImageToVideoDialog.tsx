import { SpinnerIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDefaultVideoModel, getVideoModelById, SORA_2_MODEL_ID, SORA_2_PRO_MODEL_ID } from "@/lib/video-models";
import type { VideoGenerationSettings } from "@/types/canvas";
import React, { useState, useEffect } from "react";

import {
  ModelPricingDisplay,
  VideoModelOptions,
  VideoModelSelector,
} from "./VideoModelComponents";

const IMAGE_TO_VIDEO_COPY = {
  CANCEL: "Cancel",
  CONVERTING: "Converting...",
  DESCRIPTION: "Transform your static image into a dynamic video using AI.",
  MODEL_LABEL: "Model",
  RUN: "Run",
  SHORTCUT_SYMBOL: "↵",
  TITLE: "Convert Image to Video",
  VIDEO_PREVIEW_ALT: "Source image",
} as const;

/**
 * Props for the image-to-video dialog component.
 */
interface ImageToVideoDialogProps {
  imageUrl: string;
  isConverting: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (settings: VideoGenerationSettings) => void;
  useSoraPro: boolean;
}

/**
 * Dialog component for configuring and running Sora image-to-video generations.
 */
export const ImageToVideoDialog: React.FC<ImageToVideoDialogProps> = ({
  imageUrl,
  isConverting,
  isOpen,
  onClose,
  onConvert,
  useSoraPro,
}) => {
  const defaultModel = getDefaultVideoModel("image-to-video");
  
  // Automatically select model based on useSoraPro
  const autoSelectedModelId = useSoraPro ? SORA_2_PRO_MODEL_ID : SORA_2_MODEL_ID;
  
  const [selectedModelId, setSelectedModelId] = useState<string>(autoSelectedModelId);
  const [optionValues, setOptionValues] = useState<Record<string, unknown>>(
    () => {
      const initialModel = getVideoModelById(autoSelectedModelId) || defaultModel;
      return initialModel?.defaults || {};
    }
  );

  // Update selected model when useSoraPro changes
  useEffect(() => {
    const newModelId = useSoraPro ? SORA_2_PRO_MODEL_ID : SORA_2_MODEL_ID;
    setSelectedModelId(newModelId);
    const newModel = getVideoModelById(newModelId);
    if (newModel) {
      setOptionValues(newModel.defaults);
    }
  }, [useSoraPro]);

  const model = getVideoModelById(selectedModelId) || defaultModel;

  if (!model) {
    return null;
  }

  const handleClose = () => {
    const resetModelId = useSoraPro ? SORA_2_PRO_MODEL_ID : SORA_2_MODEL_ID;
    setSelectedModelId(resetModelId);
    const resetModel = getVideoModelById(resetModelId);
    if (resetModel) {
      setOptionValues(resetModel.defaults);
    }
    onClose();
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const newModel = getVideoModelById(modelId);
    if (newModel) {
      setOptionValues(newModel.defaults);
    }
  };

  const handleOptionChange = (field: string, value: unknown) => {
    setOptionValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rawDuration = optionValues.duration;
    const parsedDuration =
      typeof rawDuration === "number"
        ? rawDuration
        : typeof rawDuration === "string" && rawDuration
          ? parseInt(rawDuration, 10)
          : undefined;

    const settings: VideoGenerationSettings = {
      ...optionValues,
      ...(parsedDuration !== undefined ? { duration: parsedDuration } : {}),
      modelId: model.id,
      prompt: (optionValues.prompt as string) || "",
      sourceUrl: imageUrl,
    } as VideoGenerationSettings;

    onConvert(settings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px] p-5">
        <DialogHeader>
          <DialogTitle>{IMAGE_TO_VIDEO_COPY.TITLE}</DialogTitle>
          <DialogDescription>
            {IMAGE_TO_VIDEO_COPY.DESCRIPTION}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2 space-y-4">
          <div className="w-full mb-4 space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              {IMAGE_TO_VIDEO_COPY.MODEL_LABEL}
            </span>
            <VideoModelSelector
              category="image-to-video"
              disabled={isConverting}
              onChange={handleModelChange}
              value={selectedModelId}
            />
          </div>

          {/* Pricing Display */}
          <ModelPricingDisplay model={model} className="mb-4" />

          <div className="flex gap-4">
            {/* Left column - Image Preview */}
            <div className="w-1/3">
              <div className="border rounded-xl overflow-hidden aspect-square flex items-center justify-center">
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={IMAGE_TO_VIDEO_COPY.VIDEO_PREVIEW_ALT}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Right column - Options */}
            <div className="w-2/3 space-y-4">
              {/* Main Options */}
              <VideoModelOptions
                disabled={isConverting}
                model={model}
                onChange={handleOptionChange}
                optionKeys={["aspectRatio", "duration", "prompt", "resolution"]}
                values={optionValues}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between gap-2">
            <Button
              disabled={isConverting}
              onClick={handleClose}
              type="button"
              variant="secondary"
            >
              {IMAGE_TO_VIDEO_COPY.CANCEL}
            </Button>
            <Button
              className="flex items-center gap-2"
              disabled={isConverting}
              type="submit"
              variant="primary"
            >
              {isConverting ? (
                <>
                  <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                  <span className="text-white">
                    {IMAGE_TO_VIDEO_COPY.CONVERTING}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-white">{IMAGE_TO_VIDEO_COPY.RUN}</span>
                  <span className="flex flex-row space-x-0.5">
                    <kbd className="flex items-center justify-center text-white tracking-tighter rounded-xl border px-1 font-mono bg-white/10 border-white/10 h-6 min-w-6 text-xs">
                      {IMAGE_TO_VIDEO_COPY.SHORTCUT_SYMBOL}
                    </kbd>
                  </span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
};
