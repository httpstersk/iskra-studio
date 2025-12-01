"use client";

/**
 * AI provider selector component for switching between FAL and Replicate.
 */

import { CANVAS_HEADER_LABELS } from "@/constants/canvas-header";
import { cn } from "@/lib/utils";
import { aiProviderAtom, isProjectsPanelOpenAtom } from "@/store/ui-atoms";
import { SegmentedControl } from "@radix-ui/themes";
import { useAtom, useAtomValue } from "jotai";

import { FalIcon } from "./FalIcon";
import { ReplicateIcon } from "./ReplicateIcon";

/** Available AI provider values */
type AIProvider = "fal" | "replicate";

/**
 * Segmented control for selecting the AI provider.
 *
 * @remarks
 * - FAL is currently the only enabled provider
 * - Replicate option is disabled but visible for future use
 *
 * @returns AI provider selector component
 */
export function AIProviderSelector() {
  const [aiProvider, setAiProvider] = useAtom(aiProviderAtom);
  const isProjectsPanelOpen = useAtomValue(isProjectsPanelOpenAtom);

  const handleValueChange = (value: string) => {
    if (value === "replicate") return;
    setAiProvider(value as AIProvider);
  };

  return (
    <SegmentedControl.Root
      className={cn(
        "transition-[margin] duration-300 ease-in-out",
        isProjectsPanelOpen ? "ml-28" : "ml-4"
      )}
      size="1"
      value={aiProvider}
      onValueChange={handleValueChange}
    >
      <SegmentedControl.Item value="fal">
        <div className="flex flex-row gap-2 justify-center items-center">
          <FalIcon />
          <span>{CANVAS_HEADER_LABELS.AI_PROVIDER_FAL}</span>
        </div>
      </SegmentedControl.Item>
      <SegmentedControl.Item
        aria-disabled
        className="cursor-not-allowed"
        value="replicate"
      >
        <div className="flex flex-row gap-2 justify-center items-center">
          <ReplicateIcon />
          <span>{CANVAS_HEADER_LABELS.AI_PROVIDER_REPLICATE}</span>
        </div>
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
