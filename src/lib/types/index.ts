// ─── Listing Types ────────────────────────────────────────────────────────────

export type TeslaVariant = "RWD" | "AWD" | "Long Range" | "Performance";
export type ListingSource = "cargurus" | "autotrader" | "cars.com" | "carmax" | "craigslist" | "tesla" | "facebook";
export type DealRating = "great" | "good" | "fair" | "overpriced" | "unknown";
export type TitleStatus = "clean" | "salvage" | "rebuilt" | "lemon" | "unknown";
export type ListingCondition = "new" | "used" | "cpo"; // cpo = certified pre-owned

export interface TeslaListing {
  id: string; // deduplication hash (VIN or content-based)
  vin?: string;

  // Core specs
  year: number;
  variant: TeslaVariant;
  trim?: string; // e.g. "Standard Range Plus", "Long Range AWD"
  mileage: number | null;
  condition: ListingCondition;

  // Pricing
  price: number;
  marketValue: number | null;
  dealRating: DealRating;
  dealDelta: number | null; // price - marketValue (negative = savings)
  dealDeltaPercent: number | null;

  // Appearance
  exteriorColor: string;
  interiorColor: string;
  seatingConfig: 5 | 7;

  // Condition
  titleStatus: TitleStatus;
  accidentFree: boolean | null;
  oneOwner: boolean | null;

  // Location
  city: string;
  state: string;
  zip?: string;
  distanceMiles?: number; // from user's search zip

  // Source
  source: ListingSource;
  sourceUrl: string;
  sourceName: string; // display name e.g. "CarGurus"
  images: string[];
  listedAt: string; // ISO date
  scrapedAt: string; // ISO date

  // Extra
  autopilot: boolean | null;
  fsd: boolean | null; // full self-driving
  description?: string;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface SearchFilters {
  yearMin: number;
  yearMax: number;
  priceMin: number;
  priceMax: number;
  mileageMax: number;
  variants: TeslaVariant[];
  exteriorColors: string[];
  interiorColors: string[];
  seatingConfigs: (5 | 7)[];
  condition: ListingCondition[];
  cleanTitleOnly: boolean;
  accidentFreeOnly: boolean;
  zip: string;
  radiusMiles: number;
}

export type SortOption = "best_deal" | "newest" | "lowest_mileage" | "lowest_price" | "highest_year";

export interface SearchParams extends SearchFilters {
  sort: SortOption;
  page: number;
  pageSize: number;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ListingsResponse {
  listings: TeslaListing[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  marketStats: MarketStats;
  fetchedAt: string;
}

export interface MarketStats {
  medianPrice: number;
  averagePrice: number;
  medianMileage: number;
  lowestPrice: number;
  highestPrice: number;
  totalListings: number;
  greatDeals: number;
  goodDeals: number;
}

// ─── Supabase DB Types ────────────────────────────────────────────────────────

export interface DbListing {
  id: string;
  vin: string | null;
  year: number;
  variant: string;
  trim: string | null;
  mileage: number | null;
  condition: string;
  price: number;
  market_value: number | null;
  deal_rating: string;
  deal_delta: number | null;
  deal_delta_percent: number | null;
  exterior_color: string;
  interior_color: string;
  seating_config: number;
  title_status: string;
  accident_free: boolean | null;
  one_owner: boolean | null;
  city: string;
  state: string;
  zip: string | null;
  source: string;
  source_url: string;
  source_name: string;
  images: string[];
  listed_at: string;
  scraped_at: string;
  autopilot: boolean | null;
  fsd: boolean | null;
  description: string | null;
  content_hash: string; // for dedup
}

// ─── Filter Constants ─────────────────────────────────────────────────────────

export const TESLA_VARIANTS: TeslaVariant[] = ["RWD", "AWD", "Long Range", "Performance"];

export const EXTERIOR_COLORS = [
  "Pearl White",
  "Solid Black",
  "Midnight Silver",
  "Deep Blue Metallic",
  "Red Multi-Coat",
  "Ultra Red",
  "Quicksilver",
  "Stealth Grey",
  "Other",
] as const;

export const INTERIOR_COLORS = [
  "Black",
  "White",
  "Cream",
  "Other",
] as const;

export const DEFAULT_FILTERS: SearchFilters = {
  yearMin: 2019,
  yearMax: new Date().getFullYear() + 1,
  priceMin: 15000,
  priceMax: 80000,
  mileageMax: 150000,
  variants: [],
  exteriorColors: [],
  interiorColors: [],
  seatingConfigs: [],
  condition: ["used", "new", "cpo"],
  cleanTitleOnly: false,
  accidentFreeOnly: false,
  zip: "",
  radiusMiles: 100,
};

export const DEFAULT_SORT: SortOption = "best_deal";

// ─── Deal Rating Helpers ──────────────────────────────────────────────────────

export const DEAL_RATING_CONFIG: Record<DealRating, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  great: {
    label: "Great Deal",
    color: "#22C55E",
    bgColor: "rgba(34,197,94,0.12)",
    description: "10%+ below market value",
  },
  good: {
    label: "Good Deal",
    color: "#84CC16",
    bgColor: "rgba(132,204,22,0.12)",
    description: "5–10% below market value",
  },
  fair: {
    label: "Fair Price",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.12)",
    description: "Within 5% of market value",
  },
  overpriced: {
    label: "Overpriced",
    color: "#EF4444",
    bgColor: "rgba(239,68,68,0.12)",
    description: "More than 5% above market value",
  },
  unknown: {
    label: "No Data",
    color: "#6B7280",
    bgColor: "rgba(107,114,128,0.12)",
    description: "Insufficient market data",
  },
};
