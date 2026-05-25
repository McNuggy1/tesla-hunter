"use client";

import { cn } from "@/lib/utils/format";
import { DEAL_RATING_CONFIG } from "@/lib/types";
import type { DealRating } from "@/lib/types";

interface DealBadgeProps {
  rating: DealRating;
  delta?: number | null;
  deltaPercent?: number | null;
  size?: "sm" | "md" | "lg";
  showDelta?: boolean;
  className?: string;
}

export function DealBadge({
  rating,
  delta,
  deltaPercent,
  size = "md",
  showDelta = false,
  className,
}: DealBadgeProps) {
  const config = DEAL_RATING_CONFIG[rating];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <div
      className={cn("inline-flex flex-col items-start gap-0.5", className)}
    >
      <span
        className={cn(
          "rounded-full font-semibold tracking-wide uppercase whitespace-nowrap",
          sizeClasses[size]
        )}
        style={{
          color: config.color,
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}30`,
        }}
      >
        {config.label}
      </span>

      {showDelta && delta !== null && delta !== undefined && deltaPercent !== null && deltaPercent !== undefined && (
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: config.color }}
        >
          {delta < 0 ? "−" : "+"}
          {Math.abs(deltaPercent).toFixed(1)}% vs market
        </span>
      )}
    </div>
  );
}
