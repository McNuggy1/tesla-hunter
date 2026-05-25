/**
 * Scraper Orchestrator
 *
 * This is the main aggregation layer. It:
 * 1. Runs all enabled scrapers in parallel
 * 2. Deduplicates results (by VIN first, then content hash)
 * 3. Computes market values across the result set
 * 4. Recalculates deal ratings based on actual market data
 * 5. Returns enriched, sorted listings
 */

import type { TeslaListing, SearchFilters, SearchParams, ListingsResponse, MarketStats } from "@/lib/types";
import { CarGurusScraper } from "./cargurus";
import { calculateDealRating } from "./base";

// Register all scrapers here — easy to add new ones
const SCRAPERS = [
  new CarGurusScraper(),
  // new AutoTraderScraper(),  // TODO: add in next iteration
  // new CarsDotComScraper(),  // TODO: add in next iteration
  // new CarMaxScraper(),      // TODO: add in next iteration
];

// ─── Main Aggregation Function ────────────────────────────────────────────────

export async function fetchListings(params: SearchParams): Promise<ListingsResponse> {
  const { sort, page, pageSize, ...filters } = params;

  // 1. Run all scrapers in parallel (with timeout safety)
  const scraperResults = await Promise.allSettled(
    SCRAPERS.filter((s) => s.enabled).map((s) =>
      Promise.race([
        s.scrape(filters, 0), // always fetch fresh from first page
        timeoutPromise(12000, s.name), // 12s timeout per scraper
      ])
    )
  );

  // 2. Flatten and collect all listings
  const allListings: TeslaListing[] = [];
  for (const result of scraperResults) {
    if (result.status === "fulfilled") {
      allListings.push(...result.value.listings);
    } else {
      console.warn("[Orchestrator] Scraper failed:", result.reason);
    }
  }

  // 3. Deduplicate
  const deduplicated = deduplicateListings(allListings);

  // 4. Apply remaining filters (some scrapers can't filter everything)
  const filtered = applyClientSideFilters(deduplicated, filters);

  // 5. Calculate market stats from this dataset
  const marketStats = calculateMarketStats(filtered);

  // 6. Enrich with computed market values
  const enriched = enrichWithMarketValue(filtered, marketStats);

  // 7. Sort
  const sorted = sortListings(enriched, sort);

  // 8. Paginate
  const start = (page - 1) * pageSize;
  const paginated = sorted.slice(start, start + pageSize);

  return {
    listings: paginated,
    total: sorted.length,
    page,
    pageSize,
    hasMore: start + pageSize < sorted.length,
    marketStats,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateListings(listings: TeslaListing[]): TeslaListing[] {
  const seen = new Map<string, TeslaListing>();

  for (const listing of listings) {
    const key = listing.vin
      ? `vin_${listing.vin.toLowerCase()}`
      : listing.id;

    if (!seen.has(key)) {
      seen.set(key, listing);
    } else {
      // Keep the one with the lower price (better deal)
      const existing = seen.get(key)!;
      if (listing.price < existing.price) {
        seen.set(key, listing);
      }
    }
  }

  return Array.from(seen.values());
}

// ─── Client-Side Filters ──────────────────────────────────────────────────────
// Scrapers do coarse filtering; we do precise filtering here

function applyClientSideFilters(
  listings: TeslaListing[],
  filters: Partial<SearchFilters>
): TeslaListing[] {
  return listings.filter((l) => {
    // Always restrict to Ontario, Canada
    if (l.state !== "ON") return false;

    if (filters.priceMin && l.price < filters.priceMin) return false;
    if (filters.priceMax && l.price > filters.priceMax) return false;
    if (filters.yearMin && l.year < filters.yearMin) return false;
    if (filters.yearMax && l.year > filters.yearMax) return false;
    if (filters.mileageMax && l.mileage && l.mileage > filters.mileageMax) return false;
    if (filters.variants?.length && !filters.variants.includes(l.variant)) return false;
    if (filters.exteriorColors?.length && !filters.exteriorColors.includes(l.exteriorColor)) return false;
    if (filters.interiorColors?.length && !filters.interiorColors.includes(l.interiorColor)) return false;
    if (filters.seatingConfigs?.length && !filters.seatingConfigs.includes(l.seatingConfig)) return false;
    if (filters.condition?.length && !filters.condition.includes(l.condition)) return false;
    if (filters.cleanTitleOnly && l.titleStatus !== "clean") return false;
    if (filters.accidentFreeOnly && l.accidentFree === false) return false;
    return true;
  });
}

// ─── Market Stats ─────────────────────────────────────────────────────────────

function calculateMarketStats(listings: TeslaListing[]): MarketStats {
  if (!listings.length) {
    return {
      medianPrice: 0,
      averagePrice: 0,
      medianMileage: 0,
      lowestPrice: 0,
      highestPrice: 0,
      totalListings: 0,
      greatDeals: 0,
      goodDeals: 0,
    };
  }

  const prices = listings.map((l) => l.price).sort((a, b) => a - b);
  const mileages = listings
    .filter((l) => l.mileage !== null)
    .map((l) => l.mileage as number)
    .sort((a, b) => a - b);

  return {
    medianPrice: median(prices),
    averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    medianMileage: mileages.length ? median(mileages) : 0,
    lowestPrice: prices[0],
    highestPrice: prices[prices.length - 1],
    totalListings: listings.length,
    greatDeals: listings.filter((l) => l.dealRating === "great").length,
    goodDeals: listings.filter((l) => l.dealRating === "good").length,
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

// ─── Market Value Enrichment ──────────────────────────────────────────────────
// Recompute deal ratings using actual market data from this search

function enrichWithMarketValue(
  listings: TeslaListing[],
  stats: MarketStats
): TeslaListing[] {
  // Group by (year, variant) to compute per-segment medians
  const segments = new Map<string, number[]>();

  for (const l of listings) {
    const key = `${l.year}_${l.variant}`;
    if (!segments.has(key)) segments.set(key, []);
    segments.get(key)!.push(l.price);
  }

  const segmentMedians = new Map<string, number>();
  for (const [key, prices] of segments) {
    segmentMedians.set(key, median(prices.sort((a, b) => a - b)));
  }

  return listings.map((l) => {
    const key = `${l.year}_${l.variant}`;
    const segmentMedian = segmentMedians.get(key) ?? stats.medianPrice;

    // Use pre-computed market value if available, otherwise use segment median
    const marketValue = l.marketValue ?? segmentMedian;
    const { rating, delta, deltaPercent } = calculateDealRating(l.price, marketValue);

    return {
      ...l,
      marketValue,
      dealRating: rating,
      dealDelta: delta,
      dealDeltaPercent: deltaPercent,
    };
  });
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortListings(listings: TeslaListing[], sort: SearchParams["sort"]): TeslaListing[] {
  const copy = [...listings];

  const DEAL_ORDER: Record<string, number> = {
    great: 0,
    good: 1,
    fair: 2,
    overpriced: 3,
    unknown: 4,
  };

  switch (sort) {
    case "best_deal":
      return copy.sort((a, b) => {
        const ratingDiff = (DEAL_ORDER[a.dealRating] ?? 4) - (DEAL_ORDER[b.dealRating] ?? 4);
        if (ratingDiff !== 0) return ratingDiff;
        return (a.dealDeltaPercent ?? 0) - (b.dealDeltaPercent ?? 0);
      });

    case "lowest_price":
      return copy.sort((a, b) => a.price - b.price);

    case "lowest_mileage":
      return copy.sort((a, b) => (a.mileage ?? 999999) - (b.mileage ?? 999999));

    case "newest":
      return copy.sort(
        (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
      );

    case "highest_year":
      return copy.sort((a, b) => b.year - a.year || a.price - b.price);

    default:
      return copy;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeoutPromise(ms: number, scraperName: string) {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${scraperName} timed out after ${ms}ms`)), ms)
  );
}
