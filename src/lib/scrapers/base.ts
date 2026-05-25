import type { TeslaListing, SearchFilters } from "@/lib/types";

// ─── Scraper Interface ────────────────────────────────────────────────────────
// Every source (CarGurus, AutoTrader, etc.) implements this interface.
// This abstraction means we can swap, add, or disable sources without
// touching the API route or business logic.

export interface ScraperResult {
  listings: TeslaListing[];
  source: string;
  totalFound: number;
  error?: string;
  durationMs: number;
}

export interface BaseScraper {
  name: string;
  sourceId: string;
  enabled: boolean;
  scrape(filters: Partial<SearchFilters>, page?: number): Promise<ScraperResult>;
}

// ─── Deduplication ────────────────────────────────────────────────────────────
// We hash listings by VIN when available, otherwise by (year + variant + price + city + mileage).
// This prevents the same car showing up from both CarGurus and AutoTrader.

import { createHash } from "crypto";

export function generateListingId(listing: Partial<TeslaListing>): string {
  // VIN is globally unique — use it if we have it
  if (listing.vin && listing.vin.length === 17) {
    return `vin_${listing.vin.toLowerCase()}`;
  }

  // Fallback: content hash
  const key = [
    listing.year,
    listing.variant,
    listing.price,
    listing.mileage,
    listing.city,
    listing.state,
    listing.exteriorColor,
  ]
    .join("_")
    .toLowerCase()
    .replace(/\s+/g, "");

  return `hash_${createHash("md5").update(key).digest("hex").slice(0, 16)}`;
}

// ─── Market Value Calculator ──────────────────────────────────────────────────
// Given a set of comparable listings, compute market value and deal rating.
// This runs after we aggregate listings from all sources.

export function calculateDealRating(
  price: number,
  marketValue: number | null
): { rating: TeslaListing["dealRating"]; delta: number | null; deltaPercent: number | null } {
  if (!marketValue) return { rating: "unknown", delta: null, deltaPercent: null };

  const delta = price - marketValue;
  const deltaPercent = (delta / marketValue) * 100;

  let rating: TeslaListing["dealRating"];
  if (deltaPercent <= -10) rating = "great";
  else if (deltaPercent <= -5) rating = "good";
  else if (deltaPercent <= 5) rating = "fair";
  else rating = "overpriced";

  return { rating, delta, deltaPercent };
}

// ─── Color Normalization ──────────────────────────────────────────────────────
// Different sources use different color names — normalize them

const COLOR_MAP: Record<string, string> = {
  "pearl white": "Pearl White",
  "white": "Pearl White",
  "multi-coat white": "Pearl White",
  "solid black": "Solid Black",
  "black": "Solid Black",
  "obsidian black": "Solid Black",
  "midnight silver": "Midnight Silver",
  "silver metallic": "Midnight Silver",
  "grey": "Midnight Silver",
  "gray": "Midnight Silver",
  "deep blue metallic": "Deep Blue Metallic",
  "blue": "Deep Blue Metallic",
  "red multi-coat": "Red Multi-Coat",
  "red": "Red Multi-Coat",
  "multi-coat red": "Red Multi-Coat",
  "ultra red": "Ultra Red",
  "quicksilver": "Quicksilver",
  "stealth grey": "Stealth Grey",
};

export function normalizeColor(raw: string): string {
  const key = raw.toLowerCase().trim();
  return COLOR_MAP[key] ?? raw.trim();
}

// ─── Variant Detection ────────────────────────────────────────────────────────

export function detectVariant(text: string): TeslaListing["variant"] {
  const lower = text.toLowerCase();
  if (lower.includes("performance")) return "Performance";
  if (lower.includes("long range") || lower.includes("long-range") || lower.includes("lr")) return "Long Range";
  if (lower.includes("awd") || lower.includes("all-wheel") || lower.includes("dual motor")) return "AWD";
  return "RWD";
}
