/**
 * Progressive Image Loader using Streams API
 * 
 * Loads images progressively with:
 * - Streaming chunks (better memory)
 * - Progress tracking
 * - Cancellation support via AbortController
 * - Automatic yielding for non-blocking UI
 * 
 * @module utils/progressive-image-loader
 */

import { yieldToMainThread } from './scheduler-helpers';

/**
 * Progress callback for streaming
 */
export interface StreamProgress {
    loaded: number;
    total: number;
    percentage: number;
}

/**
 * Options for progressive image loading
 */
export interface ProgressiveLoadOptions {
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
    /** Progress callback */
    onProgress?: (progress: StreamProgress) => void;
    /** Yield interval in bytes (default: 100KB) */
    yieldInterval?: number;
}

/**
 * Loads an image progressively using Streams API
 * 
 * Benefits over traditional fetch().blob():
 * - Progressive loading with progress tracking
 * - Lower memory usage (streaming vs buffering)
 * - Cancellable via AbortSignal
 * - Automatic yielding to prevent blocking
 * 
 * @param imageUrl - URL of the image to load
 * @param options - Loading options
 * @returns Promise resolving to Blob
 * 
 * @example
 * ```typescript
 * const controller = new AbortController();
 * const blob = await loadImageWithStreams(url, {
 *   signal: controller.signal,
 *   onProgress: ({ percentage }) => {
 *     console.log(`Loading: ${percentage}%`);
 *   }
 * });
 * ```
 */
export async function loadImageWithStreams(
    imageUrl: string,
    options: ProgressiveLoadOptions = {}
): Promise<Blob> {
    const { signal, onProgress, yieldInterval = 100 * 1024 } = options;

    // Check for Streams API support
    if (!('ReadableStream' in window)) {
        // Fallback to traditional fetch
        const response = await fetch(imageUrl, { signal });
        return response.blob();
    }

    const response = await fetch(imageUrl, { signal });

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    if (!response.body) {
        // Fallback if body is not available
        return response.blob();
    }

    // Get total size for progress tracking
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    let loaded = 0;
    const chunks: BlobPart[] = [];

    // Stream processing with progress and yielding
    const reader = response.body.getReader();

    try {
        while (true) {
            // Check for cancellation
            signal?.throwIfAborted();

            const { done, value } = await reader.read();

            if (done) break;

            chunks.push(value);
            loaded += value.length;

            // Emit progress if callback provided
            if (onProgress && total > 0) {
                onProgress({
                    loaded,
                    total,
                    percentage: Math.round((loaded / total) * 100),
                });
            }

            // Yield to main thread periodically to keep UI responsive
            if (loaded % yieldInterval < value.length) {
                await yieldToMainThread();
            }
        }
    } catch (error) {
        reader.releaseLock();
        throw error;
    }

    // Combine chunks into blob
    return new Blob(chunks);
}

/**
 * Loads an image with streams and converts to ImageBitmap
 * 
 * Combines streaming + fast decode for optimal performance
 * 
 * @param imageUrl - URL of the image
 * @param options - Loading options
 * @returns Promise resolving to ImageBitmap
 */
export async function loadImageBitmapWithStreams(
    imageUrl: string,
    options: ProgressiveLoadOptions = {}
): Promise<ImageBitmap> {
    const blob = await loadImageWithStreams(imageUrl, options);

    options.signal?.throwIfAborted();

    // Use createImageBitmap for fast decode
    if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(blob);

        // Register cleanup on abort
        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                bitmap.close();
            }, { once: true });
        }

        return bitmap;
    }

    // Fallback: Load via Image element
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = URL.createObjectURL(blob);

        options.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
    });

    // Convert to ImageBitmap if possible
    if ('createImageBitmap' in window) {
        return createImageBitmap(img);
    }

    // If neither ImageBitmap nor canvas available, throw error
    throw new Error('ImageBitmap not supported and canvas unavailable');
}
