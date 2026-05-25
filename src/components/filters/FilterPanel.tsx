"use client";

import { useSearchStore } from "@/store/searchStore";
import { TESLA_VARIANTS, EXTERIOR_COLORS, INTERIOR_COLORS } from "@/lib/types";
import type { TeslaVariant } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils/format";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";

interface FilterPanelProps {
  onClose?: () => void;
}

export function FilterPanel({ onClose }: FilterPanelProps) {
  const { filters, setFilter, resetFilters, search } = useSearchStore();

  const handleSearch = () => {
    search();
    onClose?.();
  };

  const toggleVariant = (v: TeslaVariant) => {
    const next = filters.variants.includes(v)
      ? filters.variants.filter((x) => x !== v)
      : [...filters.variants, v];
    setFilter("variants", next);
  };

  const toggleColor = (color: string, type: "exterior" | "interior") => {
    const key = type === "exterior" ? "exteriorColors" : "interiorColors";
    const list = filters[key];
    const next = list.includes(color) ? list.filter((x) => x !== color) : [...list, color];
    setFilter(key, next);
  };

  const toggleSeating = (seats: 5 | 7) => {
    const list = filters.seatingConfigs;
    const next = list.includes(seats) ? list.filter((x) => x !== seats) : [...list, seats];
    setFilter("seatingConfigs", next);
  };

  const toggleCondition = (c: "new" | "used" | "cpo") => {
    const list = filters.condition;
    const next = list.includes(c) ? list.filter((x) => x !== c) : [...list, c];
    setFilter("condition", next);
  };

  return (
    <div className="flex flex-col h-full bg-tesla-dark-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-tesla-dark-border">
        <div className="flex items-center gap-2 text-white font-semibold">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-xs text-tesla-dark-muted hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-tesla-dark-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* Location */}
        <FilterSection title="Location">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-tesla-dark-muted mb-1.5 block">ZIP Code</label>
              <input
                type="text"
                placeholder="e.g. 10001"
                value={filters.zip}
                onChange={(e) => setFilter("zip", e.target.value)}
                maxLength={5}
                className="w-full px-3 py-2 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white placeholder:text-tesla-dark-muted text-sm focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-tesla-dark-muted mb-1.5 block">
                Radius: <span className="text-white">{filters.radiusMiles} mi</span>
              </label>
              <input
                type="range"
                min={25}
                max={500}
                step={25}
                value={filters.radiusMiles}
                onChange={(e) => setFilter("radiusMiles", Number(e.target.value))}
                className="w-full accent-tesla-red"
              />
              <div className="flex justify-between text-xs text-tesla-dark-muted mt-1">
                <span>25 mi</span>
                <span>500 mi</span>
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection title="Price Range">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-tesla-dark-muted mb-1.5 block">Min</label>
                <input
                  type="number"
                  placeholder="$15,000"
                  value={filters.priceMin || ""}
                  onChange={(e) => setFilter("priceMin", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white placeholder:text-tesla-dark-muted text-sm focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-tesla-dark-muted mb-1.5 block">Max</label>
                <input
                  type="number"
                  placeholder="$80,000"
                  value={filters.priceMax || ""}
                  onChange={(e) => setFilter("priceMax", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white placeholder:text-tesla-dark-muted text-sm focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Year Range */}
        <FilterSection title="Year">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-tesla-dark-muted mb-1.5 block">From</label>
              <select
                value={filters.yearMin}
                onChange={(e) => setFilter("yearMin", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
              >
                {Array.from({ length: 7 }, (_, i) => 2019 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-tesla-dark-muted mb-1.5 block">To</label>
              <select
                value={filters.yearMax}
                onChange={(e) => setFilter("yearMax", Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-tesla-dark-card border border-tesla-dark-border text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
              >
                {Array.from({ length: 7 }, (_, i) => 2019 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </FilterSection>

        {/* Max Mileage */}
        <FilterSection title="Max Mileage">
          <div>
            <label className="text-xs text-tesla-dark-muted mb-1.5 block">
              Up to: <span className="text-white">
                {filters.mileageMax >= 150000 ? "Any" : `${(filters.mileageMax / 1000).toFixed(0)}k mi`}
              </span>
            </label>
            <input
              type="range"
              min={5000}
              max={150000}
              step={5000}
              value={filters.mileageMax}
              onChange={(e) => setFilter("mileageMax", Number(e.target.value))}
              className="w-full accent-tesla-red"
            />
            <div className="flex justify-between text-xs text-tesla-dark-muted mt-1">
              <span>5k</span>
              <span>Any</span>
            </div>
          </div>
        </FilterSection>

        {/* Variant */}
        <FilterSection title="Variant">
          <div className="grid grid-cols-2 gap-2">
            {TESLA_VARIANTS.map((v) => (
              <ToggleChip
                key={v}
                label={v}
                selected={filters.variants.includes(v)}
                onClick={() => toggleVariant(v)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Condition */}
        <FilterSection title="Condition">
          <div className="flex gap-2">
            {(["used", "new", "cpo"] as const).map((c) => (
              <ToggleChip
                key={c}
                label={c === "cpo" ? "CPO" : c.charAt(0).toUpperCase() + c.slice(1)}
                selected={filters.condition.includes(c)}
                onClick={() => toggleCondition(c)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Seating */}
        <FilterSection title="Seating">
          <div className="flex gap-2">
            <ToggleChip
              label="5-Seat"
              selected={filters.seatingConfigs.includes(5)}
              onClick={() => toggleSeating(5)}
            />
            <ToggleChip
              label="7-Seat"
              selected={filters.seatingConfigs.includes(7)}
              onClick={() => toggleSeating(7)}
            />
          </div>
        </FilterSection>

        {/* Exterior Color */}
        <FilterSection title="Exterior Color">
          <div className="flex flex-wrap gap-2">
            {EXTERIOR_COLORS.map((color) => (
              <ToggleChip
                key={color}
                label={color}
                selected={filters.exteriorColors.includes(color)}
                onClick={() => toggleColor(color, "exterior")}
              />
            ))}
          </div>
        </FilterSection>

        {/* Interior Color */}
        <FilterSection title="Interior Color">
          <div className="flex flex-wrap gap-2">
            {INTERIOR_COLORS.map((color) => (
              <ToggleChip
                key={color}
                label={color}
                selected={filters.interiorColors.includes(color)}
                onClick={() => toggleColor(color, "interior")}
              />
            ))}
          </div>
        </FilterSection>

        {/* Safety / Title */}
        <FilterSection title="History">
          <div className="space-y-2">
            <ToggleRow
              label="Clean title only"
              description="Exclude salvage, rebuilt, etc."
              checked={filters.cleanTitleOnly}
              onChange={(v) => setFilter("cleanTitleOnly", v)}
            />
            <ToggleRow
              label="Accident-free only"
              description="No reported accidents"
              checked={filters.accidentFreeOnly}
              onChange={(v) => setFilter("accidentFreeOnly", v)}
            />
          </div>
        </FilterSection>
      </div>

      {/* Apply button */}
      <div className="p-4 border-t border-tesla-dark-border">
        <button
          onClick={handleSearch}
          className="w-full py-3 rounded-xl bg-tesla-red hover:bg-tesla-red-dark text-white font-semibold text-sm transition-all duration-200 shadow-tesla-red hover:shadow-lg"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-tesla-dark-muted mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border",
        selected
          ? "bg-tesla-red/15 border-tesla-red/50 text-white"
          : "bg-white/5 border-white/10 text-tesla-dark-muted hover:bg-white/10 hover:text-white hover:border-white/20"
      )}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-150 text-left",
        checked
          ? "bg-tesla-red/10 border-tesla-red/30"
          : "bg-white/5 border-white/10 hover:bg-white/8"
      )}
    >
      <div>
        <div className="text-sm text-white font-medium">{label}</div>
        <div className="text-xs text-tesla-dark-muted">{description}</div>
      </div>
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
          checked ? "border-tesla-red bg-tesla-red" : "border-white/20"
        )}
      >
        {checked && (
          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 8 8">
            <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        )}
      </div>
    </button>
  );
}
