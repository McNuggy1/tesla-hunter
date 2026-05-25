"use client";

import { useState, useEffect } from "react";
import { useSearchStore } from "@/store/searchStore";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { cn } from "@/lib/utils/format";
import {
  SlidersHorizontal,
  Search,
  X,
  Zap,
  ChevronDown,
} from "lucide-react";

export default function SearchPage() {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { search, isLoading, filters, listings } = useSearchStore();

  useEffect(() => {
    setMounted(true);
    // Auto-search on mount
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasResults = listings.length > 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-tesla-dark-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-tesla-dark-border bg-tesla-dark-bg/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-tesla-red flex items-center justify-center shadow-tesla-red">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white tracking-tight">
              Tesla<span className="text-tesla-red">Hunter</span>
            </span>
          </a>

          {/* Nav items */}
          <div className="flex items-center gap-6 text-sm text-tesla-dark-muted">
            <span className="text-white border-b border-tesla-red pb-0.5">
              Model Y
            </span>
            <span className="cursor-not-allowed opacity-40">Model 3</span>
            <span className="cursor-not-allowed opacity-40">Model S</span>
            <span className="cursor-not-allowed opacity-40">Model X</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-tesla-dark-bg">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 relative">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-tesla-silver mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
              Live listings · Updated every 15 min
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-3">
              Find the best
              <br />
              <span className="text-tesla-red">Model Y deal</span> in Ontario
            </h1>
            <p className="text-tesla-silver text-base sm:text-lg max-w-xl">
              We aggregate listings from CarGurus, AutoTrader, Kijiji Autos, and
              more — then tell you exactly whether each price is a great deal,
              fair, or overpriced. All prices in CAD 🇨🇦
            </p>
          </div>

          {/* Quick stats */}
          <div
            className="flex flex-wrap gap-4 mt-6 animate-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            {[
              { label: "Sources", value: "4" },
              { label: "Avg savings on great deals", value: "~$3,200" },
              { label: "Listings refreshed", value: "Every 15 min" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-baseline gap-2 px-4 py-2 rounded-xl bg-white/3 border border-white/8"
              >
                <span className="text-white font-semibold">{s.value}</span>
                <span className="text-xs text-tesla-dark-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[57px] max-h-[calc(100vh-57px)] overflow-y-auto rounded-2xl border border-tesla-dark-border">
              <FilterPanel />
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            {/* Mobile filter button */}
            <div className="lg:hidden mb-4 flex items-center gap-3">
              <button
                onClick={() => setFilterDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tesla-dark-card border border-tesla-dark-border text-white text-sm font-medium hover:border-white/20 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(filters.variants.length > 0 ||
                  filters.exteriorColors.length > 0 ||
                  filters.cleanTitleOnly ||
                  filters.accidentFreeOnly) && (
                  <span className="w-5 h-5 rounded-full bg-tesla-red text-white text-xs flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={search}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tesla-red hover:bg-tesla-red-dark text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Desktop search trigger */}
            <div className="hidden lg:flex mb-4 items-center justify-between">
              <div />
              <button
                onClick={search}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-tesla-red hover:bg-tesla-red-dark text-white text-sm font-semibold transition-all shadow-tesla-red disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="w-4 h-4" />
                {isLoading ? "Searching..." : "Search Listings"}
              </button>
            </div>

            <ListingsGrid />
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filterDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setFilterDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm shadow-2xl animate-fade-in">
            <FilterPanel onClose={() => setFilterDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
