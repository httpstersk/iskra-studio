"use client";

import { useQuota } from "@/hooks/use-quota";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Video, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuotaIndicatorProps {
  className?: string;
}

export function QuotaIndicator({ className }: QuotaIndicatorProps) {
  const {
    imagesRemaining,
    imagesLimit,
    videosRemaining,
    videosLimit,
    daysUntilReset,
    isLoading,
    isWarning,
  } = useQuota();

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-20 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                "flex h-8 items-center gap-1.5 px-3 font-mono text-xs font-medium",
                imagesRemaining === 0 && "bg-destructive/10 text-destructive hover:bg-destructive/20"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>
                {imagesRemaining}/{imagesLimit}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Images remaining</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                "flex h-8 items-center gap-1.5 px-3 font-mono text-xs font-medium",
                videosRemaining === 0 && "bg-destructive/10 text-destructive hover:bg-destructive/20"
              )}
            >
              <Video className="h-3.5 w-3.5" />
              <span>
                {videosRemaining}/{videosLimit}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Videos remaining</p>
          </TooltipContent>
        </Tooltip>

        {(isWarning || daysUntilReset <= 3) && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="flex h-8 items-center gap-1.5 px-3 text-muted-foreground"
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{daysUntilReset}d</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Days until quota reset</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
