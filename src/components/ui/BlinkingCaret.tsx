"use client";

import React from "react";
import clsx from "clsx";

interface BlinkingCaretProps {
  className?: string;
}

export function BlinkingCaret({ className }: BlinkingCaretProps) {
  return (
    <span
      aria-hidden
      className={clsx(
        "pointer-events-none absolute w-[2px] rounded-sm bg-primary shadow-neon-primary animate-neon-blink",
        className
      )}
    />
  );
}
