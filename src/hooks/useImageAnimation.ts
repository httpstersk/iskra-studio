/**
 * Image loading animation hook
 *
 * Provides smooth loading animations for canvas images with pulsing
 * effect during loading and fade-in effect when loading completes.
 * Uses a single requestAnimationFrame loop for optimal performance.
 *
 * @module hooks/useImageAnimation
 */

import { useState, useEffect, useRef } from "react";

/**
 * Animation timing and opacity configuration
 */
const ANIMATION_CONFIG = {
  /** Duration of one complete pulse cycle in milliseconds */
  PULSE_DURATION: 2000,
  /** Minimum opacity during pulse animation */
  PULSE_MIN_OPACITY: 0.3,
  /** Amplitude of pulse opacity variation */
  PULSE_AMPLITUDE: 0.2,
  /** Duration of fade-in animation in milliseconds */
  FADE_DURATION: 600,
  /** Opacity for generated images */
  GENERATED_OPACITY: 0.9,
  /** Opacity for normal images */
  NORMAL_OPACITY: 1,
} as const;

/**
 * Easing function for smooth fade-in animation.
 * Uses cubic ease-out curve for natural motion.
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Props for useImageAnimation hook
 */
interface UseImageAnimationProps {
  /** Whether the image is currently loading */
  isLoading: boolean;
  /** Whether the image was generated (affects final opacity) */
  isGenerated: boolean;
  /** Whether the image element has loaded */
  hasImage: boolean;
}

/**
 * Return value from useImageAnimation hook
 */
interface UseImageAnimationReturn {
  /** Current opacity value to apply to the image */
  displayOpacity: number;
  /** Current loading animation opacity value */
  loadingOpacity: number;
}

/**
 * Custom hook for optimized image loading animations with pulsing and fade-in effects.
 *
 * Features:
 * - Smooth pulsing animation during loading (sine wave)
 * - Cubic ease-out fade-in when loading completes
 * - Single RAF loop for optimal performance
 * - Frame-rate limiting (~60fps)
 * - Automatic cleanup on unmount
 * - Different final opacity for generated vs normal images
 *
 * @param props - Hook configuration
 * @returns Current opacity values for rendering
 *
 * @example
 * ```typescript
 * const { displayOpacity } = useImageAnimation({
 *   isLoading: image.isLoading,
 *   isGenerated: image.isGenerated,
 *   hasImage: !!imageElement
 * });
 *
 * <KonvaImage
 *   image={imageElement}
 *   opacity={displayOpacity}
 * />
 * ```
 */
export const useImageAnimation = ({
  isLoading,
  isGenerated,
  hasImage,
}: UseImageAnimationProps): UseImageAnimationReturn => {
  const [displayOpacity, setDisplayOpacity] = useState<number>(
    isLoading
      ? ANIMATION_CONFIG.PULSE_MIN_OPACITY
      : isGenerated
        ? ANIMATION_CONFIG.GENERATED_OPACITY
        : ANIMATION_CONFIG.NORMAL_OPACITY,
  );
  const [loadingOpacity, setLoadingOpacity] = useState<number>(
    ANIMATION_CONFIG.PULSE_MIN_OPACITY,
  );

  const animationFrameRef = useRef<number | undefined>(undefined);
  const wasLoadingRef = useRef(isLoading);
  const fadeStartTimeRef = useRef<number>(0);
  const fadeStartOpacityRef = useRef<number>(0);

  useEffect(() => {
    // Check if we just transitioned from loading to loaded
    const justFinishedLoading = wasLoadingRef.current && !isLoading && hasImage;

    if (justFinishedLoading) {
      // Start fade-in animation
      fadeStartTimeRef.current = Date.now();
      fadeStartOpacityRef.current = loadingOpacity;
    }

    wasLoadingRef.current = isLoading;
  }, [isLoading, hasImage, loadingOpacity]);

  useEffect(() => {
    if (!isLoading && !fadeStartTimeRef.current) {
      // Not loading and no fade animation - set final opacity
      const finalOpacity = isGenerated
        ? ANIMATION_CONFIG.GENERATED_OPACITY
        : ANIMATION_CONFIG.NORMAL_OPACITY;
      setDisplayOpacity(finalOpacity);
      return;
    }

    const startTime = Date.now();
    let isFading = !!fadeStartTimeRef.current;
    let lastFrameTime = startTime;

    const animate = (currentTime: number) => {
      // Skip frame if less than 16ms has passed (limit to ~60fps)
      const timeSinceLastFrame = currentTime - lastFrameTime;
      if (timeSinceLastFrame < 16) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;

      if (isLoading) {
        // Pulsing animation while loading
        const elapsed = currentTime - startTime;
        const cycle =
          (elapsed % ANIMATION_CONFIG.PULSE_DURATION) /
          ANIMATION_CONFIG.PULSE_DURATION;
        const opacity =
          ANIMATION_CONFIG.PULSE_MIN_OPACITY +
          Math.sin(cycle * Math.PI * 2) * ANIMATION_CONFIG.PULSE_AMPLITUDE;

        setLoadingOpacity(opacity);
        setDisplayOpacity(opacity);
      } else if (isFading) {
        // Fade-in animation after loading completes
        const elapsed = currentTime - fadeStartTimeRef.current;
        const progress = Math.min(elapsed / ANIMATION_CONFIG.FADE_DURATION, 1);

        if (progress < 1) {
          const eased = easeOutCubic(progress);
          const targetOpacity = isGenerated
            ? ANIMATION_CONFIG.GENERATED_OPACITY
            : ANIMATION_CONFIG.NORMAL_OPACITY;
          const currentOpacity =
            fadeStartOpacityRef.current +
            (targetOpacity - fadeStartOpacityRef.current) * eased;

          setDisplayOpacity(currentOpacity);
        } else {
          // Fade complete
          const finalOpacity = isGenerated
            ? ANIMATION_CONFIG.GENERATED_OPACITY
            : ANIMATION_CONFIG.NORMAL_OPACITY;
          setDisplayOpacity(finalOpacity);
          isFading = false;
          fadeStartTimeRef.current = 0;
        }
      }

      // Continue animation if still loading or fading
      if (isLoading || isFading) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoading, isGenerated, hasImage]);

  return { displayOpacity, loadingOpacity };
};
