import { DBSchema, IDBPDatabase, openDB } from "idb";
import { OBJECT_STORES, STORAGE_CONSTANTS } from "./constants";
import type { CanvasState } from "@/types/project";

interface CanvasImage {
  createdAt: number;
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
}

interface CanvasVideo {
  createdAt: number;
  duration: number;
  id: string;
  originalDataUrl: string;
  uploadedUrl?: string;
}

// Using shared CanvasState from types/project; localStorage persistence removed

// IndexedDB schema
interface CanvasDB extends DBSchema {
  images: {
    key: string;
    value: CanvasImage;
  };
  videos: {
    key: string;
    value: CanvasVideo;
  };
}

class CanvasStorage {
  private db: IDBPDatabase<CanvasDB> | null = null;

  async init() {
    this.db = await openDB<CanvasDB>(
      STORAGE_CONSTANTS.DB_NAME,
      STORAGE_CONSTANTS.DB_VERSION,
      {
        upgrade(db: IDBPDatabase<CanvasDB>, oldVersion) {
          if (!db.objectStoreNames.contains(OBJECT_STORES.IMAGES)) {
            db.createObjectStore(OBJECT_STORES.IMAGES, { keyPath: "id" });
          }

          // Add videos object store in version 2
          if (
            oldVersion < 2 &&
            !db.objectStoreNames.contains(OBJECT_STORES.VIDEOS)
          ) {
            db.createObjectStore(OBJECT_STORES.VIDEOS, { keyPath: "id" });
          }
        },
      },
    );
  }

  /**
   * Deletes an image from IndexedDB.
   */
  async deleteImage(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(OBJECT_STORES.IMAGES, id);
  }

  /**
   * Deletes a video from IndexedDB.
   */
  async deleteVideo(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(OBJECT_STORES.VIDEOS, id);
  }

  /**
   * Retrieves an image from IndexedDB.
   */
  async getImage(id: string): Promise<CanvasImage | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get(OBJECT_STORES.IMAGES, id);
  }

  /**
   * Retrieves a video from IndexedDB.
   */
  async getVideo(id: string): Promise<CanvasVideo | undefined> {
    if (!this.db) await this.init();
    return await this.db!.get(OBJECT_STORES.VIDEOS, id);
  }

  /**
   * Saves an image to IndexedDB.
   */
  async saveImage(dataUrl: string, id?: string): Promise<string> {
    if (!this.db) await this.init();

    // Check size
    const sizeInBytes = new Blob([dataUrl]).size;
    if (sizeInBytes > STORAGE_CONSTANTS.MAX_FILE_SIZE) {
      throw new Error(
        `Image size exceeds maximum allowed size of ${STORAGE_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const imageId = id || crypto.randomUUID();
    const image: CanvasImage = {
      createdAt: Date.now(),
      id: imageId,
      originalDataUrl: dataUrl,
    };

    await this.db!.put(OBJECT_STORES.IMAGES, image);
    return imageId;
  }

  /**
   * Saves a video to IndexedDB.
   */
  async saveVideo(
    videoDataUrl: string,
    duration: number,
    id?: string,
  ): Promise<string> {
    if (!this.db) await this.init();

    // Check size
    const sizeInBytes = new Blob([videoDataUrl]).size;
    if (sizeInBytes > STORAGE_CONSTANTS.MAX_FILE_SIZE) {
      throw new Error(
        `Video size exceeds maximum allowed size of ${STORAGE_CONSTANTS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    const videoId = id || crypto.randomUUID();
    const video: CanvasVideo = {
      createdAt: Date.now(),
      duration,
      id: videoId,
      originalDataUrl: videoDataUrl,
    };

    await this.db!.put(OBJECT_STORES.VIDEOS, video);
    return videoId;
  }

  /**
   * Clears all stored data from IndexedDB and localStorage.
   */
  async clearAll(): Promise<void> {
    localStorage.removeItem(STORAGE_CONSTANTS.STATE_KEY);
    if (!this.db) await this.init();

    // Clear images
    const imageTx = this.db!.transaction(OBJECT_STORES.IMAGES, "readwrite");
    await imageTx.objectStore(OBJECT_STORES.IMAGES).clear();
    await imageTx.done;

    // Clear videos
    try {
      const videoTx = this.db!.transaction(OBJECT_STORES.VIDEOS, "readwrite");
      await videoTx.objectStore(OBJECT_STORES.VIDEOS).clear();
      await videoTx.done;
    } catch (e) {
      // Handle case where videos store might not exist yet in older DB versions
      console.warn("Could not clear videos store, it may not exist yet:", e);
    }
  }

  /**
   * Removes unused images and videos from IndexedDB.
   *
   * @remarks
   * Compares stored assets with elements in current canvas state
   * and deletes any assets that are no longer referenced.
   * Uses cursor-based iteration for memory efficiency with large datasets.
   */
  async cleanupOldData(state?: CanvasState): Promise<void> {
    if (!this.db) await this.init();
    if (!state) return;

    // Get all asset IDs currently in use
    const usedImageIds = new Set(
      state.elements
        .filter((el) => el.type === "image" && el.assetId)
        .map((el) => el.assetId!),
    );

    // Get all asset IDs currently in use
    const usedVideoIds = new Set(
      state.elements
        .filter((el) => el.type === "video" && el.assetId)
        .map((el) => el.assetId!),
    );

    // Delete unused images using cursor for memory efficiency
    const imageTx = this.db!.transaction(OBJECT_STORES.IMAGES, "readwrite");
    const imageStore = imageTx.objectStore(OBJECT_STORES.IMAGES);
    let imageCursor = await imageStore.openCursor();

    while (imageCursor) {
      if (!usedImageIds.has(imageCursor.value.id)) {
        await imageCursor.delete();
      }
      imageCursor = await imageCursor.continue();
    }

    await imageTx.done;

    // Delete unused videos using cursor for memory efficiency
    const videoTx = this.db!.transaction(OBJECT_STORES.VIDEOS, "readwrite");
    const videoStore = videoTx.objectStore(OBJECT_STORES.VIDEOS);
    let videoCursor = await videoStore.openCursor();

    while (videoCursor) {
      if (!usedVideoIds.has(videoCursor.value.id)) {
        await videoCursor.delete();
      }
      videoCursor = await videoCursor.continue();
    }

    await videoTx.done;
  }

  /**
   * Exports all canvas data for backup or migration.
   */
  async exportCanvasData(state: CanvasState): Promise<{
    images: CanvasImage[];
    state: CanvasState;
    videos: CanvasVideo[];
  }> {
    if (!this.db) await this.init();

    const images = await this.db!.getAll(OBJECT_STORES.IMAGES);
    const videos = await this.db!.getAll(OBJECT_STORES.VIDEOS);
    return { images, state, videos };
  }

  /**
   * Imports canvas data from a backup or migration.
   */
  async importCanvasData(data: {
    images: CanvasImage[];
    state: CanvasState;
    videos?: CanvasVideo[]; // Optional for backward compatibility
  }): Promise<void> {
    if (!this.db) await this.init();

    // Clear existing data
    await this.clearAll();

    // Import images
    const imageTx = this.db!.transaction(OBJECT_STORES.IMAGES, "readwrite");
    for (const image of data.images) {
      await imageTx.objectStore(OBJECT_STORES.IMAGES).put(image);
    }
    await imageTx.done;

    // Import videos if they exist
    if (data.videos && data.videos.length > 0) {
      const videoTx = this.db!.transaction(OBJECT_STORES.VIDEOS, "readwrite");
      for (const video of data.videos) {
        await videoTx.objectStore(OBJECT_STORES.VIDEOS).put(video);
      }
      await videoTx.done;
    }

    // State is no longer persisted locally; callers should handle Convex persistence
  }
}

export const canvasStorage = new CanvasStorage();

// Re-export from storage service
export { createStorageService } from "./storage/index";

export type { CanvasImage, CanvasVideo };
export type { CanvasElement, CanvasState } from "@/types/project";
