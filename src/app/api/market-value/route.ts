import { NextRequest, NextResponse } from "next/server";
import type { TeslaVariant } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/market-value?year=2022&variant=Long+Range
 *
 * Returns market pricing data for a specific (year, variant) combination.
 * In production this would query Supabase market_snapshots table.
 * For MVP, we use computed estimates based on depreciation curves.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const variant = searchParams.get("variant") as TeslaVariant;

  if (!year || !variant) {
    return NextResponse.json(
      { error: "year and variant are required" },
      { status: 400 }
    );
  }

  const marketData = computeMarketValue(year, variant);
  return NextResponse.json(marketData);
}

// ─── Market Value Estimation ──────────────────────────────────────────────────
// Based on Tesla Model Y historical depreciation data.
// In production, replace with Supabase queries against market_snapshots.

interface MarketValueData {
  year: number;
  variant: TeslaVariant;
  estimatedValue: number;
  priceRange: { low: number; high: number };
  depreciationPercent: number;
  dataPoints: number;
  confidence: "high" | "medium" | "low";
}

// Base MSRP by variant (approx 2024 values)
const BASE_MSRP: Record<TeslaVariant, number> = {
  RWD: 42490,
  AWD: 49490,
  "Long Range": 50490,
  Performance: 62490,
};

// Depreciation by age (years from purchase)
function getDepreciationFactor(ageYears: number): number {
  const curve: Record<number, number> = {
    0: 1.0,
    1: 0.82,  // ~18% first year
    2: 0.72,  // ~28% at 2 years
    3: 0.65,  // ~35% at 3 years
    4: 0.60,  // ~40% at 4 years
    5: 0.56,  // ~44% at 5 years
    6: 0.53,
    7: 0.50,
  };
  const clamped = Math.min(7, Math.max(0, Math.floor(ageYears)));
  return curve[clamped] ?? 0.50;
}

function computeMarketValue(year: number, variant: TeslaVariant): MarketValueData {
  const currentYear = new Date().getFullYear();
  const ageYears = currentYear - year;
  const baseMsrp = BASE_MSRP[variant] ?? 45000;
  const factor = getDepreciationFactor(ageYears);
  const estimatedValue = Math.round(baseMsrp * factor);

  // ±15% range
  const variance = estimatedValue * 0.15;

  return {
    year,
    variant,
    estimatedValue,
    priceRange: {
      low: Math.round(estimatedValue - variance),
      high: Math.round(estimatedValue + variance),
    },
    depreciationPercent: Math.round((1 - factor) * 100),
    dataPoints: 0, // 0 = estimated, >0 = from real data
    confidence: ageYears <= 2 ? "high" : ageYears <= 4 ? "medium" : "low",
  };
}
