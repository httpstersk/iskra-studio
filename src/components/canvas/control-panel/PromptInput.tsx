"use client";

/**
 * Prompt input component with keyboard shortcuts and image thumbnails
 *
 * @module components/canvas/control-panel/PromptInput
 */

import { Textarea } from "@/components/ui/textarea";
import { BlinkingCaret } from "@/components/ui/BlinkingCaret";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import React, { useCallback, useState, type KeyboardEvent } from "react";

/**
 * Props for the PromptInput component
 */
interface PromptInputProps {
  generationSettings: GenerationSettings;
  handleRun: () => void;
  images: PlacedImage[];
  isGenerating: boolean;
  selectedIds: string[];
  setGenerationSettings: (settings: GenerationSettings) => void;
}

/**
 * Prompt input textarea with optional selected image thumbnails
 * Supports Cmd/Ctrl+Enter keyboard shortcut for generation
 */
export const PromptInput = React.memo(function PromptInput({
  generationSettings,
  handleRun,
  images,
  isGenerating,
  selectedIds,
  setGenerationSettings,
}: PromptInputProps) {
  const hasSelection = selectedIds.length > 0;
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Handles keyboard shortcuts for generation
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (isGenerating) return;

        if (hasSelection || generationSettings.prompt.trim()) {
          handleRun();
        }
      }
    },
    [generationSettings.prompt, handleRun, hasSelection, isGenerating],
  );

  /**
   * Handles variation prompt change
   */
  const handleVariationPromptChange = useCallback(
    (value: string) => {
      setGenerationSettings({
        ...generationSettings,
        variationPrompt: value,
      });
    },
    [generationSettings, setGenerationSettings],
  );

  /**
   * Handles main prompt change
   */
  const handlePromptChange = useCallback(
    (value: string) => {
      setGenerationSettings({
        ...generationSettings,
        prompt: value,
      });
    },
    [generationSettings, setGenerationSettings],
  );

  if (hasSelection) {
    return (
      <div className="relative flex-1 min-w-0">
        <Textarea
          className="w-full h-16 resize-none border-none p-4 pr-24"
          onChange={(e) => handleVariationPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ fontSize: "16px" }}
          value={generationSettings.variationPrompt || ""}
        />

        {!isFocused && !(generationSettings.variationPrompt || "").trim() && (
          <BlinkingCaret className="left-4 top-4 h-6" />
        )}

        <div className="absolute top-1 right-2 flex items-center justify-end">
          <div className="flex items-center gap-1">
            {selectedIds.slice(0, 3).map((id, index) => {
              const image = images.find((img) => img.id === id);
              if (!image) return null;

              const isLast = index === Math.min(selectedIds.length - 1, 2);

              return (
                <div
                  className="relative rounded-lg border border-border/20 bg-background overflow-hidden shadow-sm"
                  key={id}
                  style={{
                    height: "48px",
                    width: "48px",
                  }}
                >
                  <img
                    alt=""
                    className="w-full h-full object-cover"
                    src={image.src}
                  />
                  {isLast && selectedIds.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        +{selectedIds.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-w-0">
      <Textarea
        className="w-full h-20 resize-none border-none p-4"
        onChange={(e) => handlePromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ fontSize: "16px" }}
        value={generationSettings.prompt}
      />
      {!isFocused && !(generationSettings.prompt || "").trim() && (
        <BlinkingCaret className="left-4 top-4 h-6" />
      )}
    </div>
  );
});
