"use client";

import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the ImageSettings component
 */
interface ImageSettingsProps {
  imageModel: "seedream" | "nano-banana";
  setImageModel: (value: "seedream" | "nano-banana") => void;
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
      onValueChange={(value) =>
        setImageModel(value as "seedream" | "nano-banana")
      }
    >
      <SegmentedControl.Item value="seedream">
        <span className="text-xs">Seedream</span>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="nano-banana">
        <span className="text-xs">Nano Banana</span>
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
