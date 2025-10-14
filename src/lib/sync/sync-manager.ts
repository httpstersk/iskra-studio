/**
 * Sync manager for synchronizing canvas state between IndexedDB and Convex.
 *
 * Handles offline queueing, conflict resolution, and bidirectional sync
 * between local IndexedDB cache and remote Convex storage.
 */

import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { canvasStorage, type CanvasElement, type CanvasState } from "../storage";
import { resolveConflict } from "./conflict-resolver";

/**
 * Queued change to be synced when online.
 */
interface QueuedChange {
  /** Unique ID for this queued change */
  id: string;
  /** Project ID to sync */
  projectId: Id<"projects">;
  /** Canvas state to sync */
  canvasState: CanvasState;
  /** Optional thumbnail storage ID */
  thumbnailStorageId?: string;
  /** Timestamp when change was queued */
  queuedAt: number;
  /** Number of retry attempts */
  retries: number;
}

/**
 * Sync result with status information.
 */
interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Error message if sync failed */
  error?: string;
  /** Timestamp of sync completion */
  syncedAt?: number;
}

/**
 * Sync manager class for handling canvas state synchronization.
 *
 * @remarks
 * This class manages bidirectional sync between IndexedDB (local cache)
 * and Convex (remote backend). It handles offline scenarios by queueing
 * changes and processing them when connectivity is restored.
 *
 * Key features:
 * - Automatic online/offline detection
 * - Change queueing for offline scenarios
 * - Conflict resolution using "last write wins"
 * - Retry logic with exponential backoff
 * - Local-first architecture with background sync
 */
export class SyncManager {
  private convexClient: ConvexReactClient;
  private syncQueue: QueuedChange[] = [];
  private isSyncing = false;
  private readonly QUEUE_KEY = "sync-queue";
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  /**
   * Creates a new sync manager instance.
   *
   * @param convexClient - Convex React client for backend communication
   */
  constructor(convexClient: ConvexReactClient) {
    this.convexClient = convexClient;
    this.loadQueue();
    this.setupNetworkListeners();
  }

  /**
   * Removes local-only fields from a canvas state before sending to Convex.
   */
  private sanitizeCanvasState(state: CanvasState) {
    const sanitizeElement = (element: CanvasElement) => ({
      id: element.id,
      type: element.type,
      transform: {
        rotation: element.transform.rotation,
        scale: element.transform.scale,
        x: element.transform.x,
        y: element.transform.y,
      },
      zIndex: element.zIndex,
      ...(element.imageId ? { imageId: element.imageId } : {}),
      ...(element.videoId ? { videoId: element.videoId } : {}),
      ...(typeof element.width === "number" ? { width: element.width } : {}),
      ...(typeof element.height === "number" ? { height: element.height } : {}),
      ...(typeof element.duration === "number"
        ? { duration: element.duration }
        : {}),
      ...(typeof element.currentTime === "number"
        ? { currentTime: element.currentTime }
        : {}),
      ...(typeof element.isPlaying === "boolean"
        ? { isPlaying: element.isPlaying }
        : {}),
      ...(typeof element.volume === "number" ? { volume: element.volume } : {}),
      ...(typeof element.muted === "boolean" ? { muted: element.muted } : {}),
    });

    const {
      backgroundColor,
      elements,
      lastModified,
      viewport,
    } = state;

    return {
      ...(backgroundColor ? { backgroundColor } : {}),
      elements: (elements ?? []).map(sanitizeElement),
      lastModified,
      ...(viewport
        ? {
            viewport: {
              scale: viewport.scale,
              x: viewport.x,
              y: viewport.y,
            },
          }
        : {}),
    };
  }

  /**
   * Loads the sync queue from localStorage.
   *
   * @private
   */
  private loadQueue(): void {
    // Skip on server-side rendering
    if (typeof window === "undefined") {
      this.syncQueue = [];
      return;
    }

    try {
      const stored = window.localStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
      this.syncQueue = [];
    }
  }

  /**
   * Persists the sync queue to localStorage.
   *
   * @private
   */
  private saveQueue(): void {
    // Skip on server-side rendering
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  /**
   * Sets up network event listeners for online/offline detection.
   *
   * @private
   */
  private setupNetworkListeners(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("Network connection restored, flushing sync queue...");
        this.flushQueue();
      });

      window.addEventListener("offline", () => {
        console.log("Network connection lost, queueing changes...");
      });
    }
  }

  /**
   * Checks if the browser is currently online.
   *
   * @returns True if online, false if offline
   */
  public isOnline(): boolean {
    if (typeof window === "undefined") return true;
    return navigator.onLine;
  }

  /**
   * Syncs canvas state to Convex backend.
   *
   * Uploads the local canvas state to Convex and updates sync metadata.
   * If offline, the change is queued for later processing.
   *
   * @param projectId - Project ID to sync
   * @param canvasState - Canvas state to upload
   * @param thumbnailStorageId - Optional thumbnail storage ID
   * @returns Sync result with success status
   *
   * @example
   * ```ts
   * const result = await syncManager.syncToConvex(
   *   projectId,
   *   canvasState,
   *   thumbnailId
   * );
   *
   * if (result.success) {
   *   console.log("Synced at:", result.syncedAt);
   * }
   * ```
   */
  public async syncToConvex(
    projectId: Id<"projects">,
    canvasState: CanvasState,
    thumbnailStorageId?: string
  ): Promise<SyncResult> {
    // If offline, queue the change
    if (!this.isOnline()) {
      this.queueChange(projectId, canvasState, thumbnailStorageId);
      return {
        success: false,
        error: "Offline - change queued for sync",
      };
    }

    try {
      // Update sync metadata
      const updatedState: CanvasState = {
        ...canvasState,
        lastSyncedAt: Date.now(),
        isDirty: false,
        syncStatus: "pending",
      };

      // Save to Convex
      await this.convexClient.mutation(api.projects.saveProject, {
        projectId,
        canvasState: this.sanitizeCanvasState(updatedState),
        thumbnailStorageId,
      });

      // Update local state with successful sync
      const finalState: CanvasState = {
        ...updatedState,
        syncStatus: "synced",
      };

      // Update IndexedDB
      canvasStorage.saveCanvasState(finalState);

      return {
        success: true,
        syncedAt: Date.now(),
      };
    } catch (error) {
      console.error("Failed to sync to Convex:", error);

      // Update sync status to error
      const errorState: CanvasState = {
        ...canvasState,
        syncStatus: "error",
        isDirty: true,
      };
      canvasStorage.saveCanvasState(errorState);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  /**
   * Syncs canvas state from Convex to IndexedDB.
   *
   * Downloads the latest canvas state from Convex and updates the local cache.
   * Handles conflicts by using the "last write wins" strategy.
   *
   * @param projectId - Project ID to sync
   * @returns Sync result with success status
   *
   * @example
   * ```ts
   * const result = await syncManager.syncFromConvex(projectId);
   *
   * if (result.success) {
   *   const localState = canvasStorage.getCanvasState();
   *   console.log("Local state updated");
   * }
   * ```
   */
  public async syncFromConvex(projectId: Id<"projects">): Promise<SyncResult> {
    if (!this.isOnline()) {
      return {
        success: false,
        error: "Offline - cannot sync from Convex",
      };
    }

    try {
      // Fetch project from Convex
      const project = await this.convexClient.query(api.projects.getProject, {
        projectId,
      });

      if (!project) {
        return {
          success: false,
          error: "Project not found",
        };
      }

      // Get local state
      const localState = canvasStorage.getCanvasState();

      // Resolve conflicts if both local and remote have changes
      let finalState = project.canvasState;

      if (localState && localState.isDirty) {
        finalState = resolveConflict(localState, project.canvasState);
      }

      // Update sync metadata
      const syncedState: CanvasState = {
        ...finalState,
        lastSyncedAt: Date.now(),
        isDirty: false,
        syncStatus: "synced",
        projectId: projectId as string,
      };

      // Save to IndexedDB
      canvasStorage.saveCanvasState(syncedState);

      return {
        success: true,
        syncedAt: Date.now(),
      };
    } catch (error) {
      console.error("Failed to sync from Convex:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown sync error",
      };
    }
  }

  /**
   * Queues a canvas state change for later sync.
   *
   * Used when offline to ensure changes are not lost and can be
   * synced when connectivity is restored.
   *
   * @param projectId - Project ID to sync
   * @param canvasState - Canvas state to queue
   * @param thumbnailStorageId - Optional thumbnail storage ID
   *
   * @example
   * ```ts
   * syncManager.queueChange(projectId, canvasState);
   * // Change will be synced automatically when online
   * ```
   */
  public queueChange(
    projectId: Id<"projects">,
    canvasState: CanvasState,
    thumbnailStorageId?: string
  ): void {
    const queuedChange: QueuedChange = {
      id: crypto.randomUUID(),
      projectId,
      canvasState,
      thumbnailStorageId,
      queuedAt: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(queuedChange);
    this.saveQueue();

    console.log("Change queued for sync:", queuedChange.id);
  }

  /**
   * Processes all queued changes and syncs them to Convex.
   *
   * Automatically called when network connectivity is restored.
   * Processes changes in FIFO order with retry logic.
   *
   * @returns Number of successfully synced changes
   *
   * @example
   * ```ts
   * const synced = await syncManager.flushQueue();
   * console.log(`Synced ${synced} changes`);
   * ```
   */
  public async flushQueue(): Promise<number> {
    if (this.isSyncing || !this.isOnline() || this.syncQueue.length === 0) {
      return 0;
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      // Process queue in order
      const queue = [...this.syncQueue];

      for (const change of queue) {
        try {
          const result = await this.syncToConvex(
            change.projectId,
            change.canvasState,
            change.thumbnailStorageId
          );

          if (result.success) {
            // Remove from queue
            this.syncQueue = this.syncQueue.filter((c) => c.id !== change.id);
            syncedCount++;
          } else if (change.retries >= this.MAX_RETRIES) {
            // Max retries reached, remove from queue
            console.error(
              `Max retries reached for queued change ${change.id}, dropping`
            );
            this.syncQueue = this.syncQueue.filter((c) => c.id !== change.id);
          } else {
            // Increment retry count
            const index = this.syncQueue.findIndex((c) => c.id === change.id);
            if (index !== -1) {
              this.syncQueue[index].retries++;
            }

            // Wait before next retry with exponential backoff
            await new Promise((resolve) =>
              setTimeout(
                resolve,
                this.RETRY_DELAY * Math.pow(2, change.retries)
              )
            );
          }
        } catch (error) {
          console.error(`Failed to sync queued change ${change.id}:`, error);

          // Increment retry count
          const index = this.syncQueue.findIndex((c) => c.id === change.id);
          if (index !== -1) {
            this.syncQueue[index].retries++;
          }
        }
      }

      // Save updated queue
      this.saveQueue();
    } finally {
      this.isSyncing = false;
    }

    console.log(`Flushed sync queue: ${syncedCount} changes synced`);
    return syncedCount;
  }

  /**
   * Gets the current sync queue length.
   *
   * @returns Number of queued changes
   */
  public getQueueLength(): number {
    return this.syncQueue.length;
  }

  /**
   * Clears the sync queue.
   *
   * @remarks
   * Use with caution - this will discard all queued changes.
   */
  public clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
  }
}

/**
 * Creates a new sync manager instance.
 *
 * @param convexClient - Convex React client
 * @returns Sync manager instance
 *
 * @example
 * ```ts
 * const convex = new ConvexReactClient(url);
 * const syncManager = createSyncManager(convex);
 *
 * // Sync to Convex
 * await syncManager.syncToConvex(projectId, canvasState);
 * ```
 */
export function createSyncManager(
  convexClient: ConvexReactClient
): SyncManager {
  return new SyncManager(convexClient);
}
