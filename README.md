# Tesla Hunter 🔴

> Find the best-priced Tesla Model Y listings. See exactly whether each price is a great deal, fair, or overpriced — compared to real market data.

![Tesla Hunter Screenshot](./docs/screenshot.png)

## Architecture Overview

```
tesla-hunter/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── listings/route.ts      # Main search endpoint (cached, 15 min TTL)
│   │   │   ├── market-value/route.ts  # Market value by year + variant
│   │   │   └── health/route.ts        # Health check
│   │   ├── search/page.tsx            # Main search page
│   │   ├── layout.tsx                 # Root layout (dark mode, fonts)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   └── DealBadge.tsx          # Great/Good/Fair/Overpriced badge
│   │   ├── listings/
│   │   │   ├── ListingCard.tsx        # Individual listing card
│   │   │   ├── ListingsGrid.tsx       # Grid + sort controls + load more
│   │   │   └── MarketStatsBanner.tsx  # Market overview stats
│   │   └── filters/
│   │       └── FilterPanel.tsx        # All filter controls (sidebar + drawer)
│   ├── lib/
│   │   ├── types/index.ts             # All TypeScript types + constants
│   │   ├── supabase/client.ts         # Supabase browser + service clients
│   │   ├── scrapers/
│   │   │   ├── base.ts               # Base interface + dedup + normalization
│   │   │   ├── cargurus.ts           # CarGurus scraper (+ mock data)
│   │   │   └── orchestrator.ts       # Parallel scraping + dedup + enrichment
│   │   └── utils/format.ts            # Formatters (price, mileage, etc.)
│   ├── store/
│   │   └── searchStore.ts             # Zustand store (filters + results + actions)
│   └── hooks/                         # (placeholder for custom hooks)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql     # Full DB schema with indexes + RLS
├── .env.local.example                 # Environment variable template
├── vercel.json                        # Vercel deployment config
└── README.md
```

## Quick Start

### 1. Clone and install
```bash
git clone https://github.com/you/tesla-hunter.git
cd tesla-hunter
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste and run `supabase/migrations/001_initial_schema.sql`
3. Copy your project URL and anon key

### 3. Configure environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Run dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **MVP Note:** In development mode, the app uses rich mock data so you can see and test everything without hitting real listing sources. Set `ENABLE_REAL_SCRAPING=true` to enable live scraping.

---

## Database Schema

### `listings` table
The core table. Each row is a deduplicated vehicle listing.

Key design decisions:
- **`id` / `content_hash`** — Deduplication happens at two levels. `id` is VIN-based when available (`vin_5YJYGDEE...`), otherwise content-hashed. `content_hash` has a `UNIQUE` constraint to prevent duplicates across scraper runs.
- **`is_active`** — Listings auto-expire after 30 days with no re-scrape. A nightly cron job can call `expire_old_listings()`.
- **Market value** — Stored denormalized on the row for fast read performance. Recomputed when market snapshots update.

### `market_snapshots` table
Daily computed market values per (year, variant) segment. Used to calculate deal ratings.

### `scrape_logs` table
Audit trail for every scraper run. Essential for debugging and monitoring scraper health.

---

## Scraper Architecture

```
User Request → /api/listings
    ↓
orchestrator.ts
    ├── CarGurusScraper.scrape()   ─┐
    ├── AutoTraderScraper.scrape() ─┤ parallel, 12s timeout each
    └── CarsDotComScraper.scrape() ─┘
    ↓
deduplicateListings()    ← by VIN first, then content hash
    ↓
applyClientSideFilters() ← precise filtering after coarse scraper filters
    ↓
calculateMarketStats()   ← compute segment medians from live data
    ↓
enrichWithMarketValue()  ← assign deal ratings using actual market data
    ↓
sortListings()           ← by deal rating, price, mileage, etc.
    ↓
Paginate → Response
```

### Adding a new scraper

1. Create `src/lib/scrapers/yoursite.ts`
2. Implement the `BaseScraper` interface
3. Add to the `SCRAPERS` array in `orchestrator.ts`

That's it. The orchestrator handles everything else.

```typescript
export class YourSiteScraper implements BaseScraper {
  name = "YourSite";
  sourceId = "yoursite";
  enabled = true;

  async scrape(filters: Partial<SearchFilters>): Promise<ScraperResult> {
    // fetch, parse, map → TeslaListing[]
  }
}
```

---

## Deal Rating Algorithm

Deal ratings are computed by comparing `listing.price` against the **segment median** — the median price of all listings with the same `(year, variant)` combination in the current search results.

| Rating | Condition |
|--------|-----------|
| 🟢 Great Deal | >10% below segment median |
| 🟡 Good Deal | 5–10% below segment median |
| 🟡 Fair Price | Within ±5% of segment median |
| 🔴 Overpriced | >5% above segment median |

When a listing has a pre-computed `marketValue` from the scraper source (e.g. CarGurus IMV), that takes precedence over the segment median.

---

## Deployment

### Vercel (recommended)

```bash
npm i -g vercel
vercel
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only, never expose to browser) |
| `LISTINGS_CACHE_TTL` | — | Cache TTL in seconds (default: 900 = 15 min) |
| `ENABLE_REAL_SCRAPING` | — | Set `true` to enable live scraping in development |
| `SCRAPER_PROXY_URL` | — | Proxy URL to avoid rate limits at scale |

---

## Roadmap

### Phase 2 — Real Listings (2–4 weeks)
- [ ] Production CarGurus scraper (proxy-backed)
- [ ] AutoTrader scraper
- [ ] Cars.com scraper
- [ ] Supabase-backed listing persistence (so scrape results survive server restarts)
- [ ] Background scraping via Vercel Cron Jobs or a standalone scraper service

### Phase 3 — User Features (4–8 weeks)
- [ ] Saved searches + email alerts for new great deals
- [ ] Price history charts per (year, variant, mileage bucket)
- [ ] VIN decoder (full specs, recall history, service bulletins)
- [ ] Supabase Auth for saved preferences

### Phase 4 — Intelligence (8–12 weeks)
- [ ] Battery degradation estimate from mileage + year
- [ ] Financing calculator (monthly payment at current rates)
- [ ] Tesla direct inventory integration (new car prices)
- [ ] Canadian market support (CAD, provincial listings)
- [ ] Price drop notifications

### Phase 5 — Scale
- [ ] Redis for distributed caching
- [ ] Dedicated scraper microservice (separate from Next.js)
- [ ] Rate limiting on API routes
- [ ] Analytics dashboard (most searched, avg deal savings, etc.)
- [ ] Model 3, S, X support

---

## Tech Decisions

**Why Zustand over React Query / SWR?**
The filter state and results are tightly coupled — a filter change should invalidate results. Zustand gives us a single store where both live, with persistence (filters survive page refresh) baked in via `persist` middleware.

**Why in-memory cache on the API route?**
For MVP simplicity. The cache is per-instance, which is fine on Vercel's single-region deployment. Phase 2 upgrades this to Redis / Upstash for distributed caching.

**Why not use a paid car listing API?**
Car data APIs (MarketCheck, RapidAPI's AutoTrader wrapper) cost $100–500/month and add latency. Scraping gives us fresher data and zero API cost. The downside is maintenance when sites change their structure — which is why the scraper abstraction layer exists.

**Why Supabase?**
PostgreSQL (reliable, powerful), great DX, free tier is generous enough for MVP, and built-in RLS means we can safely expose the client-side Supabase instance without a separate auth server.
