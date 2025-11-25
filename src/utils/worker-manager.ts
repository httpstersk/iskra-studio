/**
 * Web Worker Manager for Image Processing
 *
 * Manages a pool of Web Workers for parallel image processing.
 * Automatically distributes work across available workers.
 *
 * @module utils/worker-manager
 */

interface WorkerTask {
  id: string;
  imageData: ImageData;
  targetWidth: number;
  targetHeight: number;
  pixelSize: number;
  resolve: (dataUrl: string) => void;
  reject: (error: Error) => void;
}

interface WorkerInstance {
  worker: Worker;
  busy: boolean;
}

/**
 * Worker pool manager for parallel image processing
 */
class ImageWorkerManager {
  private workers: WorkerInstance[] = [];
  private queue: WorkerTask[] = [];
  private taskId = 0;
  private readonly maxWorkers: number;
  private supportsWorkers = false;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
    this.supportsWorkers =
      typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";

    if (this.supportsWorkers) {
      this.initializeWorkers();
    }
  }

  /**
   * Initialize worker pool
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(
          new URL("../workers/image-processing.worker.ts", import.meta.url),
          { type: "module" },
        );

        this.workers.push({
          worker,
          busy: false,
        });

        worker.onmessage = (event) => this.handleWorkerMessage(worker, event);
        worker.onerror = (error) => this.handleWorkerError(worker, error);
      } catch (error) {
        console.warn("[WorkerManager] Failed to create worker:", error);
        this.supportsWorkers = false;
        break;
      }
    }

    console.debug(`[WorkerManager] Initialized ${this.workers.length} workers`);
  }

  /**
   * Processes an image using an available worker
   */
  async processImage(
    imageData: ImageData,
    targetWidth: number,
    targetHeight: number,
    pixelSize: number,
  ): Promise<string> {
    if (!this.supportsWorkers || this.workers.length === 0) {
      throw new Error("Workers not available, use fallback");
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `task-${this.taskId++}`,
        imageData,
        targetWidth,
        targetHeight,
        pixelSize,
        resolve,
        reject,
      };

      this.queue.push(task);
      this.processQueue();
    });
  }

  /**
   * Process queued tasks with available workers
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    // Find available worker
    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return; // All workers busy

    const task = this.queue.shift();
    if (!task) return;

    // Mark worker as busy
    availableWorker.busy = true;

    // Send task to worker
    availableWorker.worker.postMessage({
      type: "process",
      id: task.id,
      imageData: task.imageData,
      targetWidth: task.targetWidth,
      targetHeight: task.targetHeight,
      pixelSize: task.pixelSize,
    });

    // Store task reference for callback
    (availableWorker.worker as any)._currentTask = task;

    // Process more tasks if available
    this.processQueue();
  }

  /**
   * Handle worker message (success/error)
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    const { type, id, dataUrl, error } = event.data;
    const task = (worker as any)._currentTask as WorkerTask;

    if (!task || task.id !== id) {
      console.warn("[WorkerManager] Received message for unknown task");
      return;
    }

    // Mark worker as available
    const workerInstance = this.workers.find((w) => w.worker === worker);
    if (workerInstance) {
      workerInstance.busy = false;
    }

    // Resolve/reject promise
    if (type === "success") {
      task.resolve(dataUrl);
    } else if (type === "error") {
      task.reject(new Error(error || "Worker processing failed"));
    }

    // Clear task reference
    delete (worker as any)._currentTask;

    // Process next queued task
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error("[WorkerManager] Worker error:", error);

    const task = (worker as any)._currentTask as WorkerTask;
    if (task) {
      task.reject(new Error(`Worker error: ${error.message}`));
      delete (worker as any)._currentTask;
    }

    // Mark worker as available
    const workerInstance = this.workers.find((w) => w.worker === worker);
    if (workerInstance) {
      workerInstance.busy = false;
    }

    // Process next task
    this.processQueue();
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const { worker } of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    console.debug("[WorkerManager] All workers terminated");
  }

  /**
   * Get worker pool stats
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      queuedTasks: this.queue.length,
      supportsWorkers: this.supportsWorkers,
    };
  }
}

/**
 * Singleton worker manager instance
 */
export const workerManager = new ImageWorkerManager();
