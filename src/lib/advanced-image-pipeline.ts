/**
 * Advanced Image Pipeline
 * 
 * Integrates all ESNext features for maximum performance:
 * - Streams API (progressive loading)
 * - WeakRef cache (automatic GC)
 * - Compression Streams (70% smaller cache)
 * - Scheduler.yield() (non-blocking)
 * - AbortController (cancellation)
 * - createImageBitmap (fast decode)
 * 
 * @module lib/advanced-image-pipeline
 */

import { compressedCache } from '@/utils/compressed-cache';
import { weakImageCache } from '@/utils/weak-image-cache';
import { yieldToMainThread } from '@/utils/scheduler-helpers';
import {
    loadImageWithStreams,
    type ProgressiveLoadOptions,
} from '@/utils/progressive-image-loader';

/**
 * Options for advanced image loading
 */
export interface AdvancedImageLoadOptions extends ProgressiveLoadOptions {
    /** Skip cache lookup */
    skipCache?: boolean;
    /** Skip cache storage */
    skipCacheStore?: boolean;
}

/**
 * Loads and caches an image using all ESNext features
 * 
 * Pipeline stages:
 * 1. Check WeakRef memory cache (instant)
 * 2. Check compressed IndexedDB cache (fast)
 * 3. Stream load with progress (network)
 * 4. Decode with createImageBitmap (hardware)
 * 5. Store compressed in IndexedDB (background)  
 * 6. Store in WeakRef cache (memory)
 * 
 * @param imageUrl - URL of image to load
 * @param options - Loading options
 * @returns HTMLImageElement ready for use
 * 
 * @example
 * ```typescript
 * const controller = new AbortController();
 * 
 * const img = await loadAndCacheImage(url, {
 *   signal: controller.signal,
 *   onProgress: ({ percentage }) => console.log(`${percentage}%`)
 * });
 * 
 * // Later: Cancel if needed
 * controller.abort();
 * ```
 */
export async function loadAndCacheImage(
    imageUrl: string,
    options: AdvancedImageLoadOptions = {}
): Promise<HTMLImageElement> {
    const { signal, skipCache, skipCacheStore } = options;

    signal?.throwIfAborted();

    // Stage 1: Check WeakRef memory cache (instant)
    if (!skipCache) {
        const cached = weakImageCache.get(imageUrl);
        if (cached) {
            console.debug('[Pipeline] ✅ WeakRef cache hit');
            return cached;
        }
    }

    // Stage 2: Check compressed persistent cache
    let blob: Blob | null = null;

    if (!skipCache) {
        blob = await compressedCache.get(imageUrl);
        if (blob) {
            console.debug('[Pipeline] ✅ Compressed cache hit');
        }
    }

    // Stage 3: Load with Streams API if not cached
    if (!blob) {
        console.debug('[Pipeline] 🌐 Fetching with streams');
        blob = await loadImageWithStreams(imageUrl, options);

        signal?.throwIfAborted();

        // Stage 4: Cache compressed version (don't await - background)
        if (!skipCacheStore) {
            compressedCache.set(imageUrl, blob).catch((err) => {
                console.warn('[Pipeline] Failed to cache compressed:', err);
            });
        }
    }

    // Stage 5: Yield before heavy decode
    await yieldToMainThread();

    signal?.throwIfAborted();

    // Stage 6: Create ImageBitmap (fast hardware decode)
    let imageSource: HTMLImageElement | HTMLCanvasElement;

    if ('createImageBitmap' in window) {
        const imageBitmap = await createImageBitmap(blob);

        signal?.throwIfAborted();

        // Convert to canvas for compatibility
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        ctx.drawImage(imageBitmap, 0, 0);
        imageBitmap.close(); // Free memory immediately

        imageSource = canvas;
    } else {
        // Fallback: traditional Image loading
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;

            signal?.addEventListener('abort', () => {
                reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
        });

        imageSource = img;
    }

    // Stage 7: Convert canvas to HTMLImageElement
    const finalImage = new Image();
    finalImage.src = imageSource instanceof HTMLCanvasElement
        ? imageSource.toDataURL()
        : imageSource.src;

    await new Promise<void>((resolve, reject) => {
        finalImage.onload = () => resolve();
        finalImage.onerror = reject;

        signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });

    // Stage 8: Store in WeakRef cache
    if (!skipCache) {
        weakImageCache.set(imageUrl, finalImage);
    }

    return finalImage;
}

/**
 * Batch loads multiple images with advanced pipeline
 * 
 * Processes images in chunks with yielding to maintain UI responsiveness
 * 
 * @param imageUrls - Array of image URLs
 * @param options - Loading options (applied to all)
 * @param chunkSize - Images to load in parallel before yielding
 * @returns Map of URL to loaded image
 */
export async function batchLoadImages(
    imageUrls: string[],
    options: AdvancedImageLoadOptions = {},
    chunkSize: number = 3
): Promise<Map<string, HTMLImageElement>> {
    const results = new Map<string, HTMLImageElement>();

    for (let i = 0; i < imageUrls.length; i += chunkSize) {
        options.signal?.throwIfAborted();

        const chunk = imageUrls.slice(i, i + chunkSize);

        // Load chunk in parallel
        const chunkResults = await Promise.all(
            chunk.map(url => loadAndCacheImage(url, options))
        );

        // Store results
        chunk.forEach((url, index) => {
            results.set(url, chunkResults[index]);
        });

        // Yield between chunks
        if (i + chunkSize < imageUrls.length) {
            await yieldToMainThread();
        }
    }

    return results;
}
