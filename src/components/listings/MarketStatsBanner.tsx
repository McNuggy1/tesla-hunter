"use client";

import type { MarketStats } from "@/lib/types";
import { formatPrice, formatMileage, cn } from "@/lib/utils/format";
import { TrendingDown, TrendingUp, BarChart2, CheckCircle2 } from "lucide-react";

interface MarketStatsBannerProps {
  stats: MarketStats;
  total: number;
  isLoading?: boolean;
}

export function MarketStatsBanner({ stats, total, isLoading }: MarketStatsBannerProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-tesla-dark-card border border-tesla-dark-border p-4 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-48 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!total) return null;

  const dealsPercent =
    total > 0
      ? Math.round(((stats.greatDeals + stats.goodDeals) / total) * 100)
      : 0;

  return (
    <div className="rounded-2xl bg-tesla-dark-card border border-tesla-dark-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-tesla-silver" />
          <span className="text-sm font-medium text-tesla-silver">
            Market Overview
          </span>
        </div>
        <span className="text-xs text-tesla-dark-muted">
          Based on {total.toLocaleString()} listings
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatItem
          label="Median Price"
          value={formatPrice(stats.medianPrice)}
          icon={<TrendingDown className="w-4 h-4 text-tesla-silver" />}
        />
        <StatItem
          label="Avg Price"
          value={formatPrice(stats.averagePrice)}
          icon={<TrendingUp className="w-4 h-4 text-tesla-silver" />}
        />
        <StatItem
          label="Median Mileage"
          value={formatMileage(stats.medianMileage)}
          icon={<BarChart2 className="w-4 h-4 text-tesla-silver" />}
        />
        <StatItem
          label="Good Deals"
          value={`${dealsPercent}%`}
          subtext={`${stats.greatDeals + stats.goodDeals} listings`}
          icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
          highlight={dealsPercent > 30}
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  subtext,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-xl",
        highlight ? "bg-green-400/5 border border-green-400/15" : "bg-white/3"
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div>
        <div
          className={cn(
            "text-base font-semibold tabular-nums",
            highlight ? "text-green-400" : "text-white"
          )}
        >
          {value}
        </div>
        <div className="text-xs text-tesla-dark-muted leading-tight">{label}</div>
        {subtext && (
          <div className="text-xs text-tesla-dark-muted/70">{subtext}</div>
        )}
      </div>
    </div>
  );
}
