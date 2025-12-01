"use client";

/**
 * Image model selector component for switching between available models.
 */

import {
  CANVAS_HEADER_CLASSES,
  CANVAS_HEADER_LABELS,
} from "@/constants/canvas-header";
import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";
import { imageModelAtom } from "@/store/ui-atoms";
import { SegmentedControl } from "@radix-ui/themes";
import { useAtom } from "jotai";

/**
 * Segmented control for selecting the image generation model.
 *
 * @remarks
 * - Seedream and Nano Banana models are currently available
 * - Model selection persists via Jotai atom
 *
 * @returns Image model selector component
 */
export function ImageModelSelector() {
  const [imageModel, setImageModel] = useAtom(imageModelAtom);

  const handleValueChange = (value: string) => {
    setImageModel(value as ImageModelId);
  };

  return (
    <SegmentedControl.Root
      className={CANVAS_HEADER_CLASSES.IMAGE_MODEL_SELECTOR}
      size="1"
      value={imageModel}
      onValueChange={handleValueChange}
    >
      <SegmentedControl.Item value={IMAGE_MODELS.SEEDREAM}>
        {CANVAS_HEADER_LABELS.IMAGE_MODEL_SEEDREAM}
      </SegmentedControl.Item>
      <SegmentedControl.Item value={IMAGE_MODELS.NANO_BANANA}>
        {CANVAS_HEADER_LABELS.IMAGE_MODEL_NANO_BANANA}
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
