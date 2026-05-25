import { NextRequest, NextResponse } from "next/server";
import type { SearchParams, SortOption } from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";
import { fetchListings } from "@/lib/scrapers/orchestrator";

export const runtime = "nodejs";

// Cache for 15 minutes by default (configurable via env)
const CACHE_TTL = Number(process.env.LISTINGS_CACHE_TTL ?? 900);

// In-memory cache for Edge/serverless (use Redis in production)
const cache = new Map<string, { data: unknown; expires: number }>();

function getCacheKey(params: SearchParams): string {
  const { page, ...rest } = params;
  // Don't include page in cache key — cache all pages together
  return JSON.stringify(rest);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseSearchParams(searchParams);

    // Check cache
    const cacheKey = getCacheKey(params);
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      const cachedData = cached.data as Record<string, unknown>;
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
      });
    }

    // Fetch fresh data
    const result = await fetchListings(params);

    // Cache result
    cache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_TTL * 1000,
    });

    // Prune old cache entries periodically
    if (cache.size > 100) {
      for (const [key, value] of cache.entries()) {
        if (value.expires < Date.now()) cache.delete(key);
      }
    }

    return NextResponse.json({ ...result, fromCache: false });
  } catch (error) {
    const err = error as Error;
    console.error("[/api/listings] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", message: err.message },
      { status: 500 }
    );
  }
}

function parseSearchParams(sp: URLSearchParams): SearchParams {
  const parseList = (key: string): string[] => {
    const val = sp.get(key);
    if (!val) return [];
    return val.split(",").filter(Boolean);
  };

  const parseIntList = (key: string): (5 | 7)[] => {
    return parseList(key)
      .map(Number)
      .filter((n) => n === 5 || n === 7) as (5 | 7)[];
  };

  return {
    // Year
    yearMin: Number(sp.get("yearMin") ?? DEFAULT_FILTERS.yearMin),
    yearMax: Number(sp.get("yearMax") ?? DEFAULT_FILTERS.yearMax),

    // Price
    priceMin: Number(sp.get("priceMin") ?? DEFAULT_FILTERS.priceMin),
    priceMax: Number(sp.get("priceMax") ?? DEFAULT_FILTERS.priceMax),

    // Mileage
    mileageMax: Number(sp.get("mileageMax") ?? DEFAULT_FILTERS.mileageMax),

    // Multi-select
    variants: parseList("variants") as SearchParams["variants"],
    exteriorColors: parseList("exteriorColors"),
    interiorColors: parseList("interiorColors"),
    seatingConfigs: parseIntList("seatingConfigs"),
    condition: parseList("condition") as SearchParams["condition"],

    // Boolean
    cleanTitleOnly: sp.get("cleanTitleOnly") === "true",
    accidentFreeOnly: sp.get("accidentFreeOnly") === "true",

    // Location
    zip: sp.get("zip") ?? DEFAULT_FILTERS.zip,
    radiusMiles: Number(sp.get("radiusMiles") ?? DEFAULT_FILTERS.radiusMiles),

    // Sort & pagination
    sort: (sp.get("sort") as SortOption) ?? "best_deal",
    page: Math.max(1, Number(sp.get("page") ?? 1)),
    pageSize: Math.min(50, Math.max(8, Number(sp.get("pageSize") ?? 12))),
  };
}
