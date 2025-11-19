/**
 * UI state hook using Jotai
 * Manages dialog visibility, settings, and UI preferences with localStorage persistence
 */

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  generationCountAtom,
  imageModelAtom,
  imageVariationTypeAtom,
  isImageToVideoDialogOpenAtom,
  isSettingsDialogOpenAtom,
  selectedImageForVideoAtom,
  showChatAtom,
  showGridAtom,
  showMinimapAtom,
  variationModeAtom,
  visibleIndicatorsAtom,
} from "@/store/ui-atoms";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Hook to manage UI state using Jotai atoms
 * Handles localStorage persistence for settings
 */
export function useUIState() {
  const [generationCount, setGenerationCount] = useAtom(generationCountAtom);
  const [imageModel, setImageModel] = useAtom(imageModelAtom);
  const [imageVariationType, setImageVariationType] = useAtom(
    imageVariationTypeAtom,
  );
  const [isImageToVideoDialogOpen, setIsImageToVideoDialogOpen] = useAtom(
    isImageToVideoDialogOpenAtom,
  );
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useAtom(
    isSettingsDialogOpenAtom,
  );
  const [selectedImageForVideo, setSelectedImageForVideo] = useAtom(
    selectedImageForVideoAtom,
  );
  const [showChat, setShowChat] = useAtom(showChatAtom);
  const [showGrid, setShowGrid] = useAtom(showGridAtom);
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);
  const [variationMode, setVariationMode] = useAtom(variationModeAtom);
  const [visibleIndicators, setVisibleIndicators] = useAtom(
    visibleIndicatorsAtom,
  );

  // Use external store for persistent settings with cross-tab sync
  const [showGridPersisted, setShowGridPersisted] = useLocalStorage(
    "showGrid",
    true,
  );
  const [showMinimapPersisted, setShowMinimapPersisted] = useLocalStorage(
    "showMinimap",
    true,
  );

  // Sync external store to Jotai atoms on mount and when external store changes
  useEffect(() => {
    setShowGrid(showGridPersisted);
  }, [showGridPersisted, setShowGrid]);

  useEffect(() => {
    setShowMinimap(showMinimapPersisted);
  }, [showMinimapPersisted, setShowMinimap]);

  // Sync Jotai atoms back to external store when they change
  useEffect(() => {
    setShowGridPersisted(showGrid);
  }, [showGrid, setShowGridPersisted]);

  useEffect(() => {
    setShowMinimapPersisted(showMinimap);
  }, [showMinimap, setShowMinimapPersisted]);

  return {
    generationCount,
    imageModel,
    imageVariationType,
    isImageToVideoDialogOpen,
    isSettingsDialogOpen,
    selectedImageForVideo,
    setGenerationCount,
    setImageModel,
    setImageVariationType,
    setIsImageToVideoDialogOpen,
    setIsSettingsDialogOpen,
    setSelectedImageForVideo,
    setShowChat,
    setShowGrid,
    setShowMinimap,
    setVariationMode,
    setVisibleIndicators,
    showChat,
    showGrid,
    showMinimap,
    variationMode,
    visibleIndicators,
  };
}
