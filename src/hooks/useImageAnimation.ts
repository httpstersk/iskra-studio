import { useState, useEffect, useRef } from "react";

/**
 * Animation constants
 */
const ANIMATION_CONFIG = {
  PULSE_DURATION: 2000, // 2 second pulse cycle
  PULSE_MIN_OPACITY: 0.3,
  PULSE_AMPLITUDE: 0.2,
  FADE_DURATION: 600, // 600ms fade-in
  GENERATED_OPACITY: 0.9,
  NORMAL_OPACITY: 1,
} as const;

/**
 * Easing function: cubic ease-out
 */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface UseImageAnimationProps {
  isLoading: boolean;
  isGenerated: boolean;
  hasImage: boolean;
}

interface UseImageAnimationReturn {
  displayOpacity: number;
  loadingOpacity: number;
}

/**
 * Optimized hook for image loading animations
 * Combines pulsing and fade-in into a single requestAnimationFrame loop
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
        : ANIMATION_CONFIG.NORMAL_OPACITY
  );
  const [loadingOpacity, setLoadingOpacity] = useState<number>(
    ANIMATION_CONFIG.PULSE_MIN_OPACITY
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
        const cycle = (elapsed % ANIMATION_CONFIG.PULSE_DURATION) / ANIMATION_CONFIG.PULSE_DURATION;
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
