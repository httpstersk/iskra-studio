/**
 * Unified animation coordinator hook
 *
 * Consolidates multiple animation loops into a single requestAnimationFrame loop
 * for optimal performance. Manages loading animations, fade-ins, and pixelation transitions.
 *
 * @module hooks/useAnimationCoordinator
 */

import { useEffect, useRef, useState } from "react";

/**
 * Animation timing and opacity configuration
 */
const ANIMATION_CONFIG = {
  /** Duration of fade-in animation in milliseconds */
  FADE_DURATION: 600,
  /** Opacity for generated images */
  GENERATED_OPACITY: 0.9,
  /** Opacity for normal images */
  NORMAL_OPACITY: 1,
  /** Duration of one complete pulse cycle in milliseconds */
  PULSE_DURATION: 2000,
  /** Minimum opacity during pulse animation */
  PULSE_MIN_OPACITY: 0.3,
  /** Amplitude of pulse opacity variation */
  PULSE_AMPLITUDE: 0.2,
  /** Duration of pixelated to full image transition in milliseconds */
  TRANSITION_DURATION: 1000,
  /** Delay before starting transition after full image loads */
  TRANSITION_DELAY: 200,
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
 * Easing function for smooth transition animation.
 * Uses cubic ease-in-out curve for natural motion.
 *
 * @param t - Progress value between 0 and 1
 * @returns Eased value between 0 and 1
 */
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Props for useAnimationCoordinator hook
 */
interface UseAnimationCoordinatorProps {
  /** Whether the image element has loaded */
  hasImage: boolean;
  /** Whether the image was generated (affects final opacity) */
  isGenerated: boolean;
  /** Whether the image is currently loading */
  isLoading: boolean;
  /** Whether pixelated overlay is present */
  hasPixelated: boolean;
}

/**
 * Return value from useAnimationCoordinator hook
 */
interface UseAnimationCoordinatorReturn {
  /** Current opacity value to apply to the image */
  displayOpacity: number;
  /** Whether the pixelation transition has completed */
  isTransitionComplete: boolean;
  /** Opacity for pixelated overlay during transition */
  pixelatedOpacity: number;
  /** Opacity for reference image during transition */
  referenceOpacity: number;
}

/**
 * Unified animation coordinator that manages all animations in a single RAF loop.
 *
 * Features:
 * - Single requestAnimationFrame loop for all animations
 * - Loading pulse animation
 * - Fade-in animation when loading completes
 * - Pixelation transition animation
 * - Frame-rate limiting (~60fps)
 * - Automatic cleanup on unmount
 *
 * @param props - Hook configuration
 * @returns Current opacity values for rendering
 *
 * @example
 * ```typescript
 * const { displayOpacity, referenceOpacity, pixelatedOpacity } = useAnimationCoordinator({
 *   isLoading: image.isLoading,
 *   isGenerated: image.isGenerated,
 *   hasImage: !!imageElement,
 *   hasPixelated: !!pixelatedImage
 * });
 * ```
 */
export const useAnimationCoordinator = ({
  hasImage,
  hasPixelated,
  isGenerated,
  isLoading,
}: UseAnimationCoordinatorProps): UseAnimationCoordinatorReturn => {
  const [displayOpacity, setDisplayOpacity] = useState<number>(
    isLoading
      ? ANIMATION_CONFIG.PULSE_MIN_OPACITY
      : isGenerated
        ? ANIMATION_CONFIG.GENERATED_OPACITY
        : ANIMATION_CONFIG.NORMAL_OPACITY
  );
  const [transitionProgress, setTransitionProgress] = useState(0);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const fadeStartOpacityRef = useRef<number>(0);
  const fadeStartTimeRef = useRef<number>(0);
  const hadPixelatedRef = useRef(hasPixelated);
  const hasStartedTransitionRef = useRef(false);
  const isTransitionCompleteRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const transitionStartTimeRef = useRef<number>(0);
  const wasLoadingRef = useRef(isLoading);

  useEffect(() => {
    // Check if we just transitioned from loading to loaded
    const justFinishedLoading = wasLoadingRef.current && !isLoading && hasImage;

    if (justFinishedLoading) {
      fadeStartTimeRef.current = Date.now();
      fadeStartOpacityRef.current = displayOpacity;
    }

    // Reset transition state when pixelated overlay changes
    if (hadPixelatedRef.current !== hasPixelated) {
      // Pixelated changed (added or removed), reset transition state
      hasStartedTransitionRef.current = false;
      isTransitionCompleteRef.current = false;
      transitionStartTimeRef.current = 0;
      setTransitionProgress(0);
      hadPixelatedRef.current = hasPixelated;
    }

    wasLoadingRef.current = isLoading;
  }, [isLoading, hasImage, displayOpacity, hasPixelated]);

  useEffect(() => {
    // Early return if no animations needed
    // Only skip animation if transition is fully complete
    if (
      !isLoading &&
      !fadeStartTimeRef.current &&
      (!hasPixelated || isTransitionCompleteRef.current)
    ) {
      const finalOpacity = isGenerated
        ? ANIMATION_CONFIG.GENERATED_OPACITY
        : ANIMATION_CONFIG.NORMAL_OPACITY;
      setDisplayOpacity(finalOpacity);
      return;
    }

    const startTime = Date.now();
    let isFading = !!fadeStartTimeRef.current;
    let isTransitioning = false;
    let transitionDelayTimeout: NodeJS.Timeout | undefined;

    // Start pixelation transition if conditions met
    if (
      hasPixelated &&
      hasImage &&
      !isLoading &&
      !hasStartedTransitionRef.current
    ) {
      hasStartedTransitionRef.current = true;
      transitionDelayTimeout = setTimeout(() => {
        transitionStartTimeRef.current = performance.now();
        isTransitioning = true;
      }, ANIMATION_CONFIG.TRANSITION_DELAY);
    }

    const animate = (currentTime: number) => {
      // Frame-rate limiting to ~60fps
      const timeSinceLastFrame = currentTime - lastFrameTimeRef.current;
      if (timeSinceLastFrame < 16) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      let shouldContinue = false;

      // Handle loading pulse animation
      if (isLoading) {
        const elapsed = currentTime - startTime;
        const cycle =
          (elapsed % ANIMATION_CONFIG.PULSE_DURATION) /
          ANIMATION_CONFIG.PULSE_DURATION;
        const opacity =
          ANIMATION_CONFIG.PULSE_MIN_OPACITY +
          Math.sin(cycle * Math.PI * 2) * ANIMATION_CONFIG.PULSE_AMPLITUDE;

        setDisplayOpacity(opacity);
        shouldContinue = true;
      }
      // Handle fade-in animation
      else if (isFading) {
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
          shouldContinue = true;
        } else {
          const finalOpacity = isGenerated
            ? ANIMATION_CONFIG.GENERATED_OPACITY
            : ANIMATION_CONFIG.NORMAL_OPACITY;
          setDisplayOpacity(finalOpacity);
          isFading = false;
          fadeStartTimeRef.current = 0;
        }
      }

      // Handle pixelation transition
      if (transitionStartTimeRef.current > 0) {
        const elapsed = currentTime - transitionStartTimeRef.current;
        const progress = Math.min(
          elapsed / ANIMATION_CONFIG.TRANSITION_DURATION,
          1
        );
        const easedProgress = easeInOutCubic(progress);

        setTransitionProgress(easedProgress);

        if (progress < 1) {
          shouldContinue = true;
        } else {
          // Mark transition as complete
          isTransitionCompleteRef.current = true;
        }
      }

      // Continue animation if needed
      if (shouldContinue) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (transitionDelayTimeout) {
        clearTimeout(transitionDelayTimeout);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoading, isGenerated, hasImage, hasPixelated]);

  // Calculate opacities based on transition progress
  const referenceOpacity = hasPixelated ? 0.4 + 0.6 * transitionProgress : 1.0;
  const pixelatedOpacity = hasPixelated ? 1.0 - transitionProgress : 0;

  return {
    displayOpacity,
    isTransitionComplete: isTransitionCompleteRef.current,
    pixelatedOpacity: displayOpacity * pixelatedOpacity,
    referenceOpacity: displayOpacity * referenceOpacity,
  };
};
