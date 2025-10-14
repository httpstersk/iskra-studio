import { useState, useCallback, useEffect, useMemo } from "react";
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
  const { toast } = useToast();
  const convexClient = useConvex();
  const currentProject = useAtomValue(currentProjectAtom);
  
  // Create sync manager instance
  const syncManager = useMemo(
    () => createSyncManager(convexClient),
    [convexClient]
  );

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
        if (
          image.src.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP")
        )
          continue;

        const existingImage = await canvasStorage.getImage(image.id);
        if (!existingImage) {
          await canvasStorage.saveImage(image.src, image.id);
        }
      }

      for (const video of videos) {
        if (
          video.src.startsWith("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP")
        )
          continue;

        const existingVideo = await canvasStorage.getVideo(video.id);
        if (!existingVideo) {
          await canvasStorage.saveVideo(video.src, video.duration, video.id);
        }
      }

      await canvasStorage.cleanupOldData();
      
      // Sync to Convex if project is loaded
      if (currentProject?._id) {
        const syncResult = await syncManager.syncToConvex(
          currentProject._id as Id<"projects">,
          canvasState
        );
        
        if (!syncResult.success) {
          console.warn("Sync to Convex failed:", syncResult.error);
          // Don't show error toast for offline scenarios - offline indicator will handle it
          if (!syncResult.error?.includes("Offline")) {
            toast({
              title: "Sync failed",
              description: "Your changes are saved locally but couldn't sync to cloud",
              variant: "destructive",
            });
          }
        }
      }
      
      setTimeout(() => setIsSaving(false), 300);
    } catch (error) {
      console.error("Failed to save to storage:", error);
      setIsSaving(false);
    }
  }, [images, videos, viewport]);

  const loadFromStorage = useCallback(async () => {
    try {
      // If project is loaded, sync from Convex first
      if (currentProject?._id) {
        const syncResult = await syncManager.syncFromConvex(
          currentProject._id as Id<"projects">
        );
        
        if (!syncResult.success) {
          console.warn("Failed to sync from Convex:", syncResult.error);
          toast({
            title: "Sync warning",
            description: "Loading local version, couldn't fetch latest from cloud",
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
              id: element.id,
              src: imageData.originalDataUrl,
              x: element.transform.x,
              y: element.transform.y,
              width: element.width || 300,
              height: element.height || 300,
              rotation: element.transform.rotation,
            });
          }
        } else if (element.type === "video" && element.videoId) {
          const videoData = await canvasStorage.getVideo(element.videoId);
          if (videoData) {
            loadedVideos.push({
              id: element.id,
              src: videoData.originalDataUrl,
              x: element.transform.x,
              y: element.transform.y,
              width: element.width || 300,
              height: element.height || 300,
              rotation: element.transform.rotation,
              isVideo: true,
              duration: element.duration || videoData.duration,
              currentTime: element.currentTime || 0,
              isPlaying: element.isPlaying || false,
              volume: element.volume || 1,
              muted: element.muted || false,
              isLoaded: false,
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
        title: "Failed to restore canvas",
        description: "Starting with a fresh canvas",
        variant: "destructive",
      });
    } finally {
      setIsStorageLoaded(true);
    }
  }, [toast, setImages, setVideos, setViewport, currentProject, syncManager]);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-save to storage when images change (with debounce)
  useEffect(() => {
    if (!isStorageLoaded) return;
    if (activeGenerationsSize > 0) return;

    const timeoutId = setTimeout(() => {
      saveToStorage();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [images, videos, viewport, isStorageLoaded, saveToStorage, activeGenerationsSize]);

  return {
    isStorageLoaded,
    isSaving,
    saveToStorage,
    loadFromStorage,
  };
}
