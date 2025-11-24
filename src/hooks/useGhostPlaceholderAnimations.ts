import { GHOST_PLACEHOLDER_ANIMATION } from "@/constants/ghost-placeholders";
import { useEffect, useRef, useState } from "react";

/**
 * Result from useGhostPlaceholderAnimations hook
 */
interface UseGhostPlaceholderAnimationsResult {
    /** Current badge scale factor */
    badgeScale: number;
    /** Opacity values for each placeholder */
    placeholderOpacities: number[];
    /** Current pulse overlay opacity */
    pulseOpacity: number;
    /** Transition key to trigger re-renders */
    transitionKey: number;
}

/**
 * Manages all animations for ghost placeholders
 * 
 * Handles three animation sequences:
 * 1. Badge scale animation - Briefly scales up badge when generation count changes
 * 2. Pulse effect - Fades out pulse overlay on reference image
 * 3. Staggered fade-in - Animates placeholder opacity with sequential delay
 * 
 * All animations use requestAnimationFrame for smooth 60fps performance.
 * 
 * @param generationCount - Number of variations to generate (4, 8, or 12)
 * @param positionIndices - Array of position indices for placeholders
 * @returns Animation state values
 */
export function useGhostPlaceholderAnimations(
    generationCount: number,
    positionIndices: number[],
): UseGhostPlaceholderAnimationsResult {
    const [transitionKey, setTransitionKey] = useState(0);
    const [placeholderOpacities, setPlaceholderOpacities] = useState<number[]>([]);
    const [pulseOpacity, setPulseOpacity] = useState(0);
    const [badgeScale, setBadgeScale] = useState<number>(GHOST_PLACEHOLDER_ANIMATION.BADGE_SCALE_NORMAL);
    const animationFrameRef = useRef<number | null>(null);

    // Trigger animation when generation count changes
    useEffect(() => {
        setTransitionKey((prev) => prev + 1);

        // Animate badge scale
        setBadgeScale(GHOST_PLACEHOLDER_ANIMATION.BADGE_SCALE_MAX);
        const badgeTimeout = setTimeout(
            () => setBadgeScale(GHOST_PLACEHOLDER_ANIMATION.BADGE_SCALE_NORMAL),
            GHOST_PLACEHOLDER_ANIMATION.BADGE_SCALE_DURATION,
        );

        // Animate pulse effect on reference image
        let pulseStart: number | null = null;

        const animatePulse = (timestamp: number) => {
            if (pulseStart === null) pulseStart = timestamp;
            const elapsed = timestamp - pulseStart;
            const progress = Math.min(
                elapsed / GHOST_PLACEHOLDER_ANIMATION.PULSE_DURATION,
                1,
            );

            // Fade out pulse
            const opacity =
                GHOST_PLACEHOLDER_ANIMATION.PULSE_OPACITY_MAX * (1 - progress);
            setPulseOpacity(opacity);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animatePulse);
            } else {
                setPulseOpacity(0);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animatePulse);

        return () => {
            clearTimeout(badgeTimeout);
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [generationCount]);

    // Animate ghost placeholder opacity with stagger effect
    useEffect(() => {
        // Initialize all to 0
        setPlaceholderOpacities(new Array(positionIndices.length).fill(0));

        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const elapsed = timestamp - startTime;

            const newOpacities = positionIndices.map((_, i) => {
                const itemStartTime = i * GHOST_PLACEHOLDER_ANIMATION.STAGGER_DELAY;
                const itemElapsed = elapsed - itemStartTime;

                if (itemElapsed < 0) return 0;

                const itemProgress = Math.min(
                    itemElapsed / GHOST_PLACEHOLDER_ANIMATION.TOTAL_DURATION,
                    1,
                );
                return GHOST_PLACEHOLDER_ANIMATION.EASE_OUT_CUBIC(itemProgress);
            });

            setPlaceholderOpacities(newOpacities);

            // Continue animation until all placeholders are fully visible
            const totalAnimationTime =
                GHOST_PLACEHOLDER_ANIMATION.TOTAL_DURATION +
                (positionIndices.length - 1) * GHOST_PLACEHOLDER_ANIMATION.STAGGER_DELAY;

            if (elapsed < totalAnimationTime) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Ensure all are set to 1 at the end
                setPlaceholderOpacities(new Array(positionIndices.length).fill(1));
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [transitionKey, generationCount, positionIndices.length]);

    return {
        badgeScale,
        placeholderOpacities,
        pulseOpacity,
        transitionKey,
    };
}
