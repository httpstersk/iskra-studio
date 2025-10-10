import { useState, useEffect } from "react";

export function useUIState() {
  // Dialog states
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isImageToVideoDialogOpen, setIsImageToVideoDialogOpen] =
    useState(false);
  const [isVideoToVideoDialogOpen, setIsVideoToVideoDialogOpen] =
    useState(false);
  const [isExtendVideoDialogOpen, setIsExtendVideoDialogOpen] = useState(false);
  const [
    isRemoveVideoBackgroundDialogOpen,
    setIsRemoveVideoBackgroundDialogOpen,
  ] = useState(false);

  // Selection states for video operations
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<
    string | null
  >(null);
  const [selectedVideoForVideo, setSelectedVideoForVideo] = useState<
    string | null
  >(null);
  const [selectedVideoForExtend, setSelectedVideoForExtend] = useState<
    string | null
  >(null);
  const [
    selectedVideoForBackgroundRemoval,
    setSelectedVideoForBackgroundRemoval,
  ] = useState<string | null>(null);

  // Canvas interaction states
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const [isolateTarget, setIsolateTarget] = useState<string | null>(null);
  const [isolateInputValue, setIsolateInputValue] = useState("");

  // View settings
  const [showGrid, setShowGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showChat, setShowChat] = useState(false);

  // API Key state
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [tempApiKey, setTempApiKey] = useState<string>("");

  // Visibility states
  const [visibleIndicators, setVisibleIndicators] = useState<Set<string>>(
    new Set()
  );
  const [hiddenVideoControlsIds, setHiddenVideoControlsIds] = useState<
    Set<string>
  >(new Set());

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("fal-api-key");
    if (savedKey) {
      setCustomApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  // Load grid setting from localStorage on mount
  useEffect(() => {
    const savedShowGrid = localStorage.getItem("showGrid");
    if (savedShowGrid !== null) {
      setShowGrid(savedShowGrid === "true");
    }
  }, []);

  // Load minimap setting from localStorage on mount
  useEffect(() => {
    const savedShowMinimap = localStorage.getItem("showMinimap");
    if (savedShowMinimap !== null) {
      setShowMinimap(savedShowMinimap === "true");
    }
  }, []);

  // Save grid setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("showGrid", showGrid.toString());
  }, [showGrid]);

  // Save minimap setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("showMinimap", showMinimap.toString());
  }, [showMinimap]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (customApiKey) {
      localStorage.setItem("fal-api-key", customApiKey);
    } else {
      localStorage.removeItem("fal-api-key");
    }
  }, [customApiKey]);

  return {
    // Dialog states
    isSettingsDialogOpen,
    setIsSettingsDialogOpen,
    isStyleDialogOpen,
    setIsStyleDialogOpen,
    isApiKeyDialogOpen,
    setIsApiKeyDialogOpen,
    isImageToVideoDialogOpen,
    setIsImageToVideoDialogOpen,
    isVideoToVideoDialogOpen,
    setIsVideoToVideoDialogOpen,
    isExtendVideoDialogOpen,
    setIsExtendVideoDialogOpen,
    isRemoveVideoBackgroundDialogOpen,
    setIsRemoveVideoBackgroundDialogOpen,

    // Video selection states
    selectedImageForVideo,
    setSelectedImageForVideo,
    selectedVideoForVideo,
    setSelectedVideoForVideo,
    selectedVideoForExtend,
    setSelectedVideoForExtend,
    selectedVideoForBackgroundRemoval,
    setSelectedVideoForBackgroundRemoval,

    // Canvas interaction states
    croppingImageId,
    setCroppingImageId,
    isolateTarget,
    setIsolateTarget,
    isolateInputValue,
    setIsolateInputValue,

    // View settings
    showGrid,
    setShowGrid,
    showMinimap,
    setShowMinimap,
    showChat,
    setShowChat,

    // API key
    customApiKey,
    setCustomApiKey,
    tempApiKey,
    setTempApiKey,

    // Visibility
    visibleIndicators,
    setVisibleIndicators,
    hiddenVideoControlsIds,
    setHiddenVideoControlsIds,
  };
}
