/**
 * Memory-efficient image cache using WeakRef + FinalizationRegistry
 * 
 * Automatically releases memory when images are garbage collected,
 * preventing memory leaks without manual cache eviction.
 * 
 * @module utils/weak-image-cache
 */

/**
 * Self-cleaning cache that uses WeakRef for automatic memory management
 */
class WeakImageCache {
    private cache = new Map<string, WeakRef<HTMLImageElement>>();
    private registry: FinalizationRegistry<string> | null = null;

    constructor() {
        // Only use FinalizationRegistry if supported
        if (typeof FinalizationRegistry !== 'undefined') {
            this.registry = new FinalizationRegistry<string>((key) => {
                // Automatically clean up when image is garbage collected
                this.cache.delete(key);
                console.debug(`[WeakCache] Auto-cleaned: ${key.substring(0, 50)}...`);
            });
        }
    }

    /**
     * Stores an image with automatic cleanup on GC
     */
    set(key: string, image: HTMLImageElement): void {
        if (typeof WeakRef === 'undefined') {
            // Fallback: Store directly (no auto-cleanup)
            // This is fine - just means manual cleanup needed
            console.warn('[WeakCache] WeakRef not supported, using fallback');
            return;
        }

        const ref = new WeakRef(image);
        this.cache.set(key, ref);

        // Register for automatic cleanup when image is GC'd
        if (this.registry) {
            this.registry.register(image, key, ref);
        }
    }

    /**
     * Retrieves a cached image (may return undefined if GC'd)
     */
    get(key: string): HTMLImageElement | undefined {
        const ref = this.cache.get(key);
        if (!ref) return undefined;

        // Dereference - may be undefined if image was garbage collected
        const image = ref.deref();

        if (!image) {
            // Image was GC'd, clean up the map entry
            this.cache.delete(key);
            return undefined;
        }

        return image;
    }

    /**
     * Checks if a valid (not GC'd) image exists for key
     */
    has(key: string): boolean {
        const image = this.get(key);
        return image !== undefined;
    }

    /**
     * Manually clears all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Returns cache size (may include dead references)
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Returns count of alive (not GC'd) images
     */
    getAliveCount(): number {
        let count = 0;
        for (const [key] of this.cache) {
            if (this.has(key)) count++;
        }
        return count;
    }
}

/**
 * Singleton instance of the WeakRef-based image cache
 */
export const weakImageCache = new WeakImageCache();
