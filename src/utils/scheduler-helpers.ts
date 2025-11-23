/**
 * Scheduler helpers for non-blocking operations
 * 
 * Provides utilities to yield control to the main thread,
 * preventing long tasks and maintaining smooth UI interactions.
 * 
 * Uses Scheduler API when available, with graceful fallbacks.
 * 
 * @module utils/scheduler-helpers
 */

/**
 * Window with experimental Scheduler API types
 */
interface WindowWithScheduler extends Window {
    scheduler?: {
        yield?: () => Promise<void>;
        postTask?: <T>(
            callback: () => T,
            options?: { priority?: 'user-blocking' | 'user-visible' | 'background' }
        ) => Promise<T>;
    };
}

/**
 * Yields control to the main thread to prevent blocking
 * 
 * Uses the most appropriate API available:
 * 1. Scheduler.yield() (Chrome 94+ with flag)
 * 2. scheduler.postTask() (Chrome 94+)
 * 3. requestIdleCallback (Chrome 47+, Firefox 55+)
 * 4. setTimeout fallback (universal)
 * 
 * @returns Promise that resolves after yielding
 */
export async function yieldToMainThread(): Promise<void> {
    const win = window as WindowWithScheduler;

    // Best: Scheduler.yield() - explicit yield point
    if (win.scheduler && typeof win.scheduler.yield === 'function') {
        await win.scheduler.yield();
        return;
    }

    // Good: scheduler.postTask with user-visible priority
    if (win.scheduler && typeof win.scheduler.postTask === 'function') {
        await win.scheduler.postTask(() => { }, { priority: 'user-visible' });
        return;
    }

    // Fallback: requestIdleCallback
    if ('requestIdleCallback' in window) {
        return new Promise((resolve) => {
            requestIdleCallback(() => resolve());
        });
    }

    // Universal fallback: setTimeout
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

/**
 * Processes an array in chunks, yielding to main thread between chunks
 * 
 * This prevents long tasks (>50ms) that block user interactions.
 * 
 * @param items - Array to process
 * @param processor - Function to process each item
 * @param chunkSize - Items to process before yielding (default: 10)
 * @returns Promise with array of results
 * 
 * @example
 * ```typescript
 * const results = await processInChunks(
 *   images,
 *   async (img) => generatePixelatedOverlay(img),
 *   3 // Process 3 images before yielding
 * );
 * ```
 */
export async function processInChunks<T, R>(
    items: T[],
    processor: (item: T, index: number) => R | Promise<R>,
    chunkSize: number = 10
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);

        // Process chunk in parallel
        const chunkResults = await Promise.all(
            chunk.map((item, chunkIndex) => processor(item, i + chunkIndex))
        );

        results.push(...chunkResults);

        // Yield to main thread after each chunk (except the last)
        if (i + chunkSize < items.length) {
            await yieldToMainThread();
        }
    }

    return results;
}

/**
 * Executes a callback with automatic yielding after timeout
 * 
 * Useful for long-running synchronous operations that need
 * periodic yield points.
 * 
 * @param callback - Function to execute
 * @param maxExecutionTime - Max ms before yielding (default: 50ms)
 * @returns Result of callback
 */
export async function executeWithYield<T>(
    callback: () => T,
    maxExecutionTime: number = 50
): Promise<T> {
    const startTime = performance.now();
    const result = callback();
    const elapsed = performance.now() - startTime;

    // Yield if we exceeded the threshold
    if (elapsed > maxExecutionTime) {
        await yieldToMainThread();
    }

    return result;
}
