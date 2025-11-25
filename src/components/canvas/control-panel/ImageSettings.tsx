"use client";

import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";
import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the ImageSettings component
 */
interface ImageSettingsProps {
  imageModel: ImageModelId;
  setImageModel: (value: ImageModelId) => void;
}

/**
 * Image-specific settings controls (Model switcher)
 */
export function ImageSettings({
  imageModel,
  setImageModel,
}: ImageSettingsProps) {
  return (
    <SegmentedControl.Root
      size="1"
      value={imageModel}
      onValueChange={(value) => setImageModel(value as ImageModelId)}
    >
      <SegmentedControl.Item value={IMAGE_MODELS.SEEDREAM}>
        <span className="text-xs">Seedream</span>
      </SegmentedControl.Item>
      <SegmentedControl.Item value={IMAGE_MODELS.NANO_BANANA}>
        <span className="text-xs">Nano Banana</span>
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
