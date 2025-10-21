"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SegmentedControlOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps {
  value: string;
  onValueChange: (value: string) => void;
  options: [SegmentedControlOption, SegmentedControlOption];
  activeColor?: string;
  inactiveColor?: string;
  className?: string;
}

export function SegmentedControl({
  value,
  onValueChange,
  options,
  activeColor = "bg-primary text-primary-foreground",
  inactiveColor = "text-muted-foreground",
  className,
}: SegmentedControlProps) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsPrimitive.List className="inline-flex h-full w-full items-center justify-center rounded-lg bg-muted/50 p-0.5">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.value;
          
          return (
            <TabsPrimitive.Trigger
              key={option.value}
              value={option.value}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:pointer-events-none disabled:opacity-50",
                isActive ? activeColor : inactiveColor
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{option.label}</span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
