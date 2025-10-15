import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useConvex } from "convex/react";
import { useAtomValue } from "jotai";
import { canvasStorage, type CanvasState } from "@/lib/storage";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { Viewport } from "./useCanvasState";
import {
  imageToCanvasElement,
  videoToCanvasElement,
} from "@/utils/canvas-utils";
import { snapImagesToGrid } from "@/utils/snap-utils";
import { useToast } from "@/hooks/use-toast";
import { createSyncManager } from "@/lib/sync/sync-manager";
import { currentProjectAtom } from "@/store/project-atoms";
import type { Id } from "../../convex/_generated/dataModel";
import { UI_CONSTANTS, PLACEHOLDER_URLS } from "@/lib/constants";

export function useStorage(
  images: PlacedImage[],
  videos: PlacedVideo[],
  viewport: Viewport,
  setImages: (images: PlacedImage[]) => void,
  setVideos: (videos: PlacedVideo[]) => void,
  setViewport: (viewport: Viewport) => void,
  activeGenerationsSize: number,
) {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const convexClient = useConvex();
  const currentProject = useAtomValue(currentProjectAtom);
  const { toast } = useToast();
  
  // Use ref to store syncManager to ensure proper cleanup
  const syncManagerRef = useRef(createSyncManager(convexClient));

  // Clean up syncManager on unmount
  useEffect(() => {
    return () => {
      syncManagerRef.current.destroy();
    };
  }, []);

  const saveToStorage = useCallback(async () => {
    try {
      setIsSaving(true);

      const canvasState: CanvasState = {
        elements: [
          ...images.map(imageToCanvasElement),
          ...videos.map(videoToCanvasElement),
        ],
        backgroundColor: "#ffffff",
        lastModified: Date.now(),
        viewport: viewport,
        projectId: currentProject?._id as string | undefined,
        isDirty: true, // Mark as dirty until synced
        syncStatus: "pending",
      };
      canvasStorage.saveCanvasState(canvasState);

      for (const image of images) {
        if (image.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

        const existingImage = await canvasStorage.getImage(image.id);
        if (!existingImage) {
          await canvasStorage.saveImage(image.src, image.id);
        }
      }

      for (const video of videos) {
        if (video.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

        const existingVideo = await canvasStorage.getVideo(video.id);
        if (!existingVideo) {
          await canvasStorage.saveVideo(video.src, video.duration, video.id);
        }
      }

      await canvasStorage.cleanupOldData();
      
      // Sync to Convex if project is loaded
      if (currentProject?._id) {
        const syncResult = await syncManagerRef.current.syncToConvex(
          currentProject._id as Id<"projects">,
          canvasState
        );
        
        if (!syncResult.success) {
          // Don't show error toast for offline scenarios - offline indicator will handle it
          if (!syncResult.error?.includes("Offline")) {
            toast({
              description: "Your changes are saved locally but couldn't sync to cloud",
              title: "Sync failed",
              variant: "destructive",
            });
          }
        }
      }
      
      // Debounce hiding the saving indicator to prevent flashing UI
      // setTimeout necessary here for precise timing delay, not animation-dependent
      setTimeout(() => setIsSaving(false), UI_CONSTANTS.SAVING_INDICATOR_DELAY_MS);
    } catch (error) {
      console.error("Failed to save to storage:", error);
      setIsSaving(false);
    }
  }, [currentProject?._id, images, toast, videos, viewport]);

  const loadFromStorage = useCallback(async () => {
    try {
      // If project is loaded, sync from Convex first
      if (currentProject?._id) {
        const syncResult = await syncManagerRef.current.syncFromConvex(
          currentProject._id as Id<"projects">
        );
        
        if (!syncResult.success) {
          toast({
            description: "Loading local version, couldn't fetch latest from cloud",
            title: "Sync warning",
          });
        }
      }
      
      const canvasState = canvasStorage.getCanvasState();
      if (!canvasState) {
        setIsStorageLoaded(true);
        return;
      }

      const loadedImages: PlacedImage[] = [];
      const loadedVideos: PlacedVideo[] = [];

      for (const element of canvasState.elements) {
        if (element.type === "image" && element.imageId) {
          const imageData = await canvasStorage.getImage(element.imageId);
          if (imageData) {
            loadedImages.push({
              height: element.height || 300,
              id: element.id,
              rotation: element.transform.rotation,
              src: imageData.originalDataUrl,
              width: element.width || 300,
              x: element.transform.x,
              y: element.transform.y,
            });
          }
        } else if (element.type === "video" && element.videoId) {
          const videoData = await canvasStorage.getVideo(element.videoId);
          if (videoData) {
            loadedVideos.push({
              currentTime: element.currentTime || 0,
              duration: element.duration || videoData.duration,
              height: element.height || 300,
              id: element.id,
              isLoaded: false,
              isPlaying: element.isPlaying || false,
              isVideo: true,
              muted: element.muted || false,
              rotation: element.transform.rotation,
              src: videoData.originalDataUrl,
              volume: element.volume || 1,
              width: element.width || 300,
              x: element.transform.x,
              y: element.transform.y,
            });
          }
        }
      }

      if (loadedImages.length > 0) {
        setImages(snapImagesToGrid(loadedImages));
      }

      if (loadedVideos.length > 0) {
        setVideos(loadedVideos);
      }

      if (canvasState.viewport) {
        setViewport(canvasState.viewport);
      }
    } catch (error) {
      console.error("Failed to load from storage:", error);
      toast({
        description: "Starting with a fresh canvas",
        title: "Failed to restore canvas",
        variant: "destructive",
      });
    } finally {
      setIsStorageLoaded(true);
    }
  }, [currentProject?._id, setImages, setVideos, setViewport, toast]);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-save to storage when images change (with debounce)
  useEffect(() => {
    if (!isStorageLoaded) return;
    if (activeGenerationsSize > 0) return;

    const timeoutId = setTimeout(() => {
      void saveToStorage();
    }, UI_CONSTANTS.STORAGE_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [activeGenerationsSize, images, isStorageLoaded, saveToStorage, videos, viewport]);

  return {
    isStorageLoaded,
    isSaving,
    saveToStorage,
    loadFromStorage,
  };
}
