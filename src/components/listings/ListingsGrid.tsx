"use client";

import { useSearchStore } from "@/store/searchStore";
import { ListingCard } from "./ListingCard";
import { MarketStatsBanner } from "./MarketStatsBanner";
import type { SortOption } from "@/lib/types";
import { cn } from "@/lib/utils/format";
import { ArrowUpDown, Loader2, RefreshCw, Search } from "lucide-react";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best_deal", label: "Best Deal" },
  { value: "lowest_price", label: "Lowest Price" },
  { value: "lowest_mileage", label: "Lowest Miles" },
  { value: "newest", label: "Newest Listed" },
  { value: "highest_year", label: "Newest Year" },
];

export function ListingsGrid() {
  const {
    listings,
    total,
    marketStats,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    sort,
    setSort,
    search,
    loadMore,
    fetchedAt,
    fromCache,
  } = useSearchStore();

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    search();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Search className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <p className="text-white font-medium mb-1">Search failed</p>
          <p className="text-tesla-dark-muted text-sm">{error}</p>
        </div>
        <button
          onClick={search}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors border border-white/10"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-tesla-dark-card border border-tesla-dark-border animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!listings.length && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Search className="w-8 h-8 text-tesla-dark-muted" />
        </div>
        <div>
          <p className="text-white font-medium mb-1">No listings found</p>
          <p className="text-tesla-dark-muted text-sm">
            Try expanding your filters or increasing the search radius
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Market Stats */}
      {marketStats && (
        <MarketStatsBanner stats={marketStats} total={total} />
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">
            {total.toLocaleString()} listings
          </span>
          {fromCache && fetchedAt && (
            <span className="text-xs text-tesla-dark-muted">
              · cached {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-tesla-dark-muted" />
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={cn(
                  "hidden sm:block px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
                  sort === opt.value
                    ? "bg-white/10 border-white/20 text-white"
                    : "bg-transparent border-transparent text-tesla-dark-muted hover:text-white hover:bg-white/5"
                )}
              >
                {opt.label}
              </button>
            ))}

            {/* Mobile: dropdown */}
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="sm:hidden px-2 py-1.5 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white text-xs focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {listings.map((listing, i) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            style={{
              animationDelay: `${Math.min(i, 11) * 50}ms`,
              animationFillMode: "both",
            }}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more...
              </>
            ) : (
              "Load more listings"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-tesla-dark-card border border-tesla-dark-border overflow-hidden">
      <div className="aspect-[16/9] bg-white/5 animate-shimmer bg-gradient-to-r from-white/5 via-white/8 to-white/5 bg-[length:200%_100%]" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 bg-white/5 rounded w-32 animate-pulse" />
          <div className="h-5 bg-white/5 rounded w-20 animate-pulse" />
        </div>
        <div className="h-1.5 bg-white/5 rounded animate-pulse" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-white/5 rounded w-16 animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-6 bg-white/5 rounded-full w-20 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
