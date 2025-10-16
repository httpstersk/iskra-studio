"use client";

import React, { useMemo, useRef } from "react";
import { motion, useInView, UseInViewOptions } from "motion/react";

import { cn } from "@/lib/utils";

interface ShimmeringTextProps {
  animate?: boolean;
  className?: string;
  color?: string;
  delay?: number;
  duration?: number;
  inViewMargin?: UseInViewOptions["margin"];
  once?: boolean;
  repeat?: boolean;
  repeatDelay?: number;
  shimmerColor?: string;
  spread?: number;
  startOnView?: boolean;
  text: string;
}

export function ShimmeringText({
  animate = true,
  className,
  color,
  delay = 0,
  duration = 2,
  inViewMargin,
  once = false,
  repeat = true,
  repeatDelay = 0.5,
  shimmerColor,
  spread = 2,
  startOnView = true,
  text,
}: ShimmeringTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });

  const dynamicSpread = useMemo(() => {
    return text.length * spread;
  }, [text, spread]);

  const shouldAnimate = animate && (!startOnView || isInView);

  return (
    <motion.span
      ref={ref}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--base-color:var(--muted-foreground)] [--shimmer-color:var(--foreground)]",
        "[background-repeat:no-repeat,padding-box]",
        "[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--shimmer-color),transparent_calc(50%+var(--spread)))]",
        "dark:[--base-color:var(--muted-foreground)] dark:[--shimmer-color:var(--foreground)]",
        className,
      )}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          ...(color && { "--base-color": color }),
          ...(shimmerColor && { "--shimmer-color": shimmerColor }),
          backgroundImage: `var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as React.CSSProperties
      }
      initial={{
        backgroundPosition: animate ? "100% center" : "0% center",
        opacity: animate ? 0 : 1,
      }}
      animate={
        shouldAnimate
          ? {
              backgroundPosition: "0% center",
              opacity: 1,
            }
          : {
              opacity: 1,
            }
      }
      transition={{
        backgroundPosition: {
          repeat: repeat ? Infinity : 0,
          duration,
          delay,
          repeatDelay,
          ease: "linear",
        },
        opacity: {
          duration: 0.3,
          delay,
        },
      }}
    >
      {text}
    </motion.span>
  );
}
