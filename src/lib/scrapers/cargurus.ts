/**
 * CarGurus Scraper
 *
 * Strategy: CarGurus has a public search API used by their own web frontend.
 * We call their internal search endpoint (same as the website uses).
 * This is the most reliable free approach for MVP.
 *
 * Production upgrade path:
 * - Use a paid proxy service (BrightData, Oxylabs) to scale
 * - Or integrate the official CarGurus dealer API if you get access
 */

import type { BaseScraper, ScraperResult } from "./base";
import type { SearchFilters, TeslaListing } from "@/lib/types";
import { generateListingId, normalizeColor, detectVariant, calculateDealRating } from "./base";
import axios from "axios";

const CARGURUS_BASE = "https://www.cargurus.com";

// CarGurus internal search API params
// These mirror what the CG frontend sends — stable for years
function buildCargurusUrl(filters: Partial<SearchFilters>, page = 0): string {
  const params = new URLSearchParams({
    zip: filters.zip || "10001",
    distance: String(filters.radiusMiles || 100),
    trim: "Tesla Model Y",
    // CG model IDs: Model Y = d2340
    listingType: "USED",
    // Price range
    minPrice: String(filters.priceMin || 0),
    maxPrice: String(filters.priceMax || 999999),
    // Year range
    minYear: String(filters.yearMin || 2019),
    maxYear: String(filters.yearMax || 2025),
    // Mileage
    maxMileage: String(filters.mileageMax || 999999),
    // Sort
    sortDir: "ASC",
    sortType: "PRICE",
    // Pagination
    startIndex: String(page * 15),
    maxResults: "15",
    showNegotiable: "true",
  });

  if (filters.cleanTitleOnly) {
    params.set("hasCleanTitle", "true");
  }

  return `${CARGURUS_BASE}/Cars/searchResults.action?${params.toString()}`;
}

export class CarGurusScraper implements BaseScraper {
  name = "CarGurus";
  sourceId = "cargurus";
  enabled = true;

  async scrape(
    filters: Partial<SearchFilters>,
    page = 0
  ): Promise<ScraperResult> {
    const start = Date.now();

    try {
      // NOTE FOR MVP: We return mock data unless ENABLE_REAL_SCRAPING=true is set.
      // This works in both dev and production until real scraping is configured.
      if (!process.env.ENABLE_REAL_SCRAPING) {
        return generateMockCarGurusData(filters, page, start);
      }

      const url = buildCargurusUrl(filters, page);
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: CARGURUS_BASE,
        },
        timeout: 10000,
        proxy: process.env.SCRAPER_PROXY_URL
          ? {
              host: process.env.SCRAPER_PROXY_URL,
              port: 8080,
              auth: {
                username: "user",
                password: process.env.SCRAPER_PROXY_KEY || "",
              },
            }
          : undefined,
      });

      const listings = parseCarGurusResponse(response.data);

      return {
        listings,
        source: this.sourceId,
        totalFound: listings.length,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      const err = error as Error;
      console.error(`[CarGurus] Scrape failed:`, err.message);
      return {
        listings: [],
        source: this.sourceId,
        totalFound: 0,
        error: err.message,
        durationMs: Date.now() - start,
      };
    }
  }
}

function parseCarGurusResponse(data: unknown): TeslaListing[] {
  // This would parse the actual CarGurus response format
  // The structure varies - inspect network tab on cargurus.com to see current format
  const listings: TeslaListing[] = [];

  try {
    const items = (data as Record<string, unknown[]>)?.listings ?? [];
    for (const item of items) {
      const raw = item as Record<string, unknown>;
      const listing = mapCarGurusListing(raw);
      if (listing) listings.push(listing);
    }
  } catch {
    // Parsing errors are non-fatal — return what we have
  }

  return listings;
}

function mapCarGurusListing(raw: Record<string, unknown>): TeslaListing | null {
  try {
    const price = Number(raw.price ?? raw.listingPrice ?? 0);
    if (!price) return null;

    const year = Number(raw.modelYear ?? raw.year ?? 0);
    if (!year) return null;

    const marketValue = Number(raw.suggestedRetailValue ?? raw.imvPrice ?? 0) || null;
    const { rating, delta, deltaPercent } = calculateDealRating(price, marketValue);

    const id = generateListingId({
      vin: raw.vin as string,
      year,
      variant: detectVariant(String(raw.trim ?? raw.subTrim ?? "")),
      price,
      mileage: Number(raw.mileage ?? 0) || null,
      city: String(raw.city ?? ""),
      state: String(raw.stateCode ?? ""),
    });

    return {
      id,
      vin: raw.vin as string,
      year,
      variant: detectVariant(String(raw.trim ?? raw.subTrim ?? "")),
      trim: String(raw.trim ?? ""),
      mileage: Number(raw.mileage) || null,
      condition: raw.listingType === "NEW" ? "new" : "used",
      price,
      marketValue,
      dealRating: rating,
      dealDelta: delta,
      dealDeltaPercent: deltaPercent,
      exteriorColor: normalizeColor(String(raw.exteriorColor ?? "Unknown")),
      interiorColor: normalizeColor(String(raw.interiorColor ?? "Unknown")),
      seatingConfig: String(raw.trim ?? "").includes("7") ? 7 : 5,
      titleStatus: ((raw.titleStatus as string) ?? "unknown") as import("@/lib/types").TitleStatus,
      accidentFree: raw.hasAccidents === false,
      oneOwner: raw.ownerCount === 1,
      city: String(raw.city ?? ""),
      state: String(raw.stateCode ?? ""),
      zip: String(raw.zip ?? ""),
      source: "cargurus",
      sourceUrl: `https://www.cargurus.com/Cars/listingDetail.action?listingId=${raw.id}`,
      sourceName: "CarGurus",
      images: (raw.pictures as string[]) ?? [],
      listedAt: String(raw.listingDate ?? new Date().toISOString()),
      scrapedAt: new Date().toISOString(),
      autopilot: null,
      fsd: null,
      description: String(raw.description ?? ""),
    };
  } catch {
    return null;
  }
}

// ─── Mock Data Generator (for development) ────────────────────────────────────

function generateMockCarGurusData(
  filters: Partial<SearchFilters>,
  page: number,
  start: number
): ScraperResult {
  const listings = MOCK_LISTINGS.slice(page * 8, page * 8 + 8).map((l) => ({
    ...l,
    distanceMiles: Math.floor(Math.random() * (filters.radiusMiles || 100)),
  }));

  return {
    listings,
    source: "cargurus",
    totalFound: MOCK_LISTINGS.length,
    durationMs: Date.now() - start,
  };
}

const MOCK_LISTINGS: TeslaListing[] = [
  {
    id: "hash_a1b2c3d4e5f6",
    vin: "5YJYGDEE1MF123456",
    year: 2021,
    variant: "Long Range",
    trim: "Long Range AWD",
    mileage: 28450,
    condition: "used",
    price: 42500,
    marketValue: 47000,
    dealRating: "great",
    dealDelta: -4500,
    dealDeltaPercent: -9.6,
    exteriorColor: "Pearl White",
    interiorColor: "Black",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Toronto",
    state: "ON",
    zip: "M5V 3A8",
    source: "cargurus",
    sourceUrl: "https://www.cargurus.com/Cars/listingDetail.action?listingId=l12345",
    sourceName: "CarGurus",
    images: [
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1611016186353-9af58c69a533?w=800",
    ],
    listedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "One owner, clean Carfax, all service records available. Non-smoker, garage kept.",
  },
  {
    id: "hash_b2c3d4e5f6a7",
    vin: "5YJYGDEE2MF234567",
    year: 2022,
    variant: "Performance",
    trim: "Performance",
    mileage: 18200,
    condition: "used",
    price: 58900,
    marketValue: 57500,
    dealRating: "fair",
    dealDelta: 1400,
    dealDeltaPercent: 2.4,
    exteriorColor: "Midnight Silver",
    interiorColor: "White",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Mississauga",
    state: "ON",
    zip: "L5B 3C1",
    source: "cargurus",
    sourceUrl: "https://www.cargurus.com/Cars/listingDetail.action?listingId=l23456",
    sourceName: "CarGurus",
    images: [
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800",
    ],
    listedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: true,
    description: "FSD included, track mode, still under Tesla warranty.",
  },
  {
    id: "hash_c3d4e5f6a7b8",
    vin: "5YJYGDEE3MF345678",
    year: 2023,
    variant: "RWD",
    trim: "Standard Range RWD",
    mileage: 9100,
    condition: "used",
    price: 39900,
    marketValue: 44000,
    dealRating: "great",
    dealDelta: -4100,
    dealDeltaPercent: -9.3,
    exteriorColor: "Solid Black",
    interiorColor: "Black",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Brampton",
    state: "ON",
    zip: "L6Y 4X2",
    source: "cargurus",
    sourceUrl: "https://www.cargurus.com/Cars/listingDetail.action?listingId=l34567",
    sourceName: "CarGurus",
    images: [
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800",
    ],
    listedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "Barely driven, essentially new condition. Winter tires included.",
  },
  {
    id: "hash_d4e5f6a7b8c9",
    vin: "5YJYGDEE4MF456789",
    year: 2020,
    variant: "Long Range",
    trim: "Long Range AWD",
    mileage: 52000,
    condition: "used",
    price: 34500,
    marketValue: 35500,
    dealRating: "fair",
    dealDelta: -1000,
    dealDeltaPercent: -2.8,
    exteriorColor: "Deep Blue Metallic",
    interiorColor: "White",
    seatingConfig: 7,
    titleStatus: "clean",
    accidentFree: false,
    oneOwner: false,
    city: "Ottawa",
    state: "ON",
    zip: "K1P 1J1",
    source: "cargurus",
    sourceUrl: "https://www.cargurus.com/Cars/listingDetail.action?listingId=l45678",
    sourceName: "CarGurus",
    images: [
      "https://images.unsplash.com/photo-1571127236794-81c5a17c0571?w=800",
    ],
    listedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "7-seat configuration, second owner, minor incident on Carfax. Priced accordingly.",
  },
  {
    id: "hash_e5f6a7b8c9d0",
    vin: "5YJYGDEE5MF567890",
    year: 2022,
    variant: "AWD",
    trim: "AWD",
    mileage: 31800,
    condition: "used",
    price: 49900,
    marketValue: 45500,
    dealRating: "overpriced",
    dealDelta: 4400,
    dealDeltaPercent: 9.7,
    exteriorColor: "Red Multi-Coat",
    interiorColor: "Black",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Markham",
    state: "ON",
    zip: "L3R 0A1",
    source: "cargurus",
    sourceUrl: "https://www.cargurus.com/Cars/listingDetail.action?listingId=l56789",
    sourceName: "CarGurus",
    images: [
      "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800",
    ],
    listedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "Premium package, dealer listing. Enquire about financing.",
  },
  {
    id: "hash_f6a7b8c9d0e1",
    vin: "5YJYGDEE6MF678901",
    year: 2023,
    variant: "Long Range",
    trim: "Long Range AWD",
    mileage: 14200,
    condition: "used",
    price: 53500,
    marketValue: 58500,
    dealRating: "great",
    dealDelta: -5000,
    dealDeltaPercent: -8.5,
    exteriorColor: "Pearl White",
    interiorColor: "Black",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Hamilton",
    state: "ON",
    zip: "L8P 1H1",
    source: "autotrader",
    sourceUrl: "https://www.autotrader.ca/a/tesla/model%20y/hamilton/ontario/123456",
    sourceName: "AutoTrader",
    images: [
      "https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800",
    ],
    listedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: true,
    description: "Transferable FSD, full warranty remaining, immaculate condition. Winter tires included.",
  },
  {
    id: "hash_g7b8c9d0e1f2",
    vin: "5YJYGDEE7MF789012",
    year: 2024,
    variant: "RWD",
    trim: "Standard Range RWD",
    mileage: 4500,
    condition: "used",
    price: 45000,
    marketValue: 47500,
    dealRating: "good",
    dealDelta: -2500,
    dealDeltaPercent: -5.3,
    exteriorColor: "Stealth Grey",
    interiorColor: "Black",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "London",
    state: "ON",
    zip: "N6A 3A1",
    source: "autotrader",
    sourceUrl: "https://www.autotrader.ca/a/tesla/model%20y/london/ontario/234567",
    sourceName: "AutoTrader",
    images: [
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800",
    ],
    listedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "Nearly new, like off-showroom condition. Still under full warranty.",
  },
  {
    id: "hash_h8c9d0e1f2g3",
    vin: "5YJYGDEE8MF890123",
    year: 2021,
    variant: "Performance",
    trim: "Performance",
    mileage: 38500,
    condition: "used",
    price: 46200,
    marketValue: 48500,
    dealRating: "good",
    dealDelta: -2300,
    dealDeltaPercent: -4.7,
    exteriorColor: "Solid Black",
    interiorColor: "White",
    seatingConfig: 5,
    titleStatus: "clean",
    accidentFree: true,
    oneOwner: true,
    city: "Vaughan",
    state: "ON",
    zip: "L4K 1T7",
    source: "cars.com",
    sourceUrl: "https://www.kijiji.ca/v-cars-trucks/city-of-toronto/123456",
    sourceName: "Kijiji Autos",
    images: [
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    ],
    listedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    scrapedAt: new Date().toISOString(),
    autopilot: true,
    fsd: false,
    description: "Track mode enabled, new Michelin all-season tires. No accidents.",
  },
];
