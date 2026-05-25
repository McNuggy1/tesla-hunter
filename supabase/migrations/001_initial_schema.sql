-- ============================================================
-- Tesla Hunter - Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fast text search

-- ─── Listings Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id              TEXT PRIMARY KEY,         -- content hash for dedup
  vin             TEXT,
  year            SMALLINT NOT NULL,
  variant         TEXT NOT NULL,            -- RWD | AWD | Long Range | Performance
  trim            TEXT,
  mileage         INTEGER,
  condition       TEXT NOT NULL DEFAULT 'used', -- new | used | cpo
  price           INTEGER NOT NULL,
  market_value    INTEGER,
  deal_rating     TEXT NOT NULL DEFAULT 'unknown',
  deal_delta      INTEGER,                  -- price - market_value
  deal_delta_percent DECIMAL(5,2),
  exterior_color  TEXT NOT NULL DEFAULT 'Unknown',
  interior_color  TEXT NOT NULL DEFAULT 'Unknown',
  seating_config  SMALLINT NOT NULL DEFAULT 5,
  title_status    TEXT NOT NULL DEFAULT 'unknown',
  accident_free   BOOLEAN,
  one_owner       BOOLEAN,
  city            TEXT NOT NULL,
  state           TEXT NOT NULL,
  zip             TEXT,
  latitude        DECIMAL(9,6),
  longitude       DECIMAL(9,6),
  source          TEXT NOT NULL,
  source_url      TEXT NOT NULL,
  source_name     TEXT NOT NULL,
  images          TEXT[] NOT NULL DEFAULT '{}',
  listed_at       TIMESTAMPTZ NOT NULL,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,              -- listings auto-expire after 30 days
  autopilot       BOOLEAN,
  fsd             BOOLEAN,
  description     TEXT,
  content_hash    TEXT UNIQUE NOT NULL,     -- for cross-source deduplication
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Market Value Snapshots ───────────────────────────────────────────────────
-- We compute market value per (year, variant) combination daily
CREATE TABLE IF NOT EXISTS market_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year            SMALLINT NOT NULL,
  variant         TEXT NOT NULL,
  sample_count    INTEGER NOT NULL,
  median_price    INTEGER NOT NULL,
  avg_price       INTEGER NOT NULL,
  p25_price       INTEGER NOT NULL,  -- 25th percentile
  p75_price       INTEGER NOT NULL,  -- 75th percentile
  median_mileage  INTEGER,
  snapshotted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, variant, snapshotted_at::DATE)
);

-- ─── Saved Searches (future feature) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID,                     -- null = guest (cookie-based)
  session_id      TEXT,
  name            TEXT NOT NULL,
  filters         JSONB NOT NULL,
  sort_option     TEXT NOT NULL DEFAULT 'best_deal',
  notify_email    TEXT,
  notify_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Scrape Jobs Log ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source          TEXT NOT NULL,
  status          TEXT NOT NULL,            -- success | partial | failed
  listings_found  INTEGER NOT NULL DEFAULT 0,
  listings_new    INTEGER NOT NULL DEFAULT 0,
  listings_updated INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  duration_ms     INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Primary search filters
CREATE INDEX idx_listings_year ON listings(year);
CREATE INDEX idx_listings_variant ON listings(variant);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_mileage ON listings(mileage);
CREATE INDEX idx_listings_deal_rating ON listings(deal_rating);
CREATE INDEX idx_listings_condition ON listings(condition);
CREATE INDEX idx_listings_state ON listings(state);
CREATE INDEX idx_listings_zip ON listings(zip);
CREATE INDEX idx_listings_is_active ON listings(is_active);
CREATE INDEX idx_listings_listed_at ON listings(listed_at DESC);
CREATE INDEX idx_listings_scraped_at ON listings(scraped_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_listings_year_variant ON listings(year, variant);
CREATE INDEX idx_listings_active_deal ON listings(is_active, deal_rating, deal_delta);
CREATE INDEX idx_listings_active_price ON listings(is_active, price);
CREATE INDEX idx_listings_active_mileage ON listings(is_active, mileage);

-- VIN dedup
CREATE INDEX idx_listings_vin ON listings(vin) WHERE vin IS NOT NULL;

-- Market snapshots
CREATE INDEX idx_market_year_variant ON market_snapshots(year, variant, snapshotted_at DESC);

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-expire listings (mark inactive after 30 days of no update)
CREATE OR REPLACE FUNCTION expire_old_listings()
RETURNS void AS $$
BEGIN
  UPDATE listings
  SET is_active = FALSE
  WHERE is_active = TRUE
    AND scraped_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ─── Views ───────────────────────────────────────────────────────────────────

-- Active listings with latest market value
CREATE OR REPLACE VIEW active_listings AS
SELECT
  l.*,
  ms.median_price AS market_median,
  ms.p25_price AS market_p25,
  ms.p75_price AS market_p75
FROM listings l
LEFT JOIN LATERAL (
  SELECT median_price, p25_price, p75_price
  FROM market_snapshots ms
  WHERE ms.year = l.year AND ms.variant = l.variant
  ORDER BY snapshotted_at DESC
  LIMIT 1
) ms ON TRUE
WHERE l.is_active = TRUE;

-- ─── RLS Policies (Row Level Security) ───────────────────────────────────────

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Public read access to listings and market data
CREATE POLICY "listings_public_read" ON listings
  FOR SELECT USING (TRUE);

CREATE POLICY "market_snapshots_public_read" ON market_snapshots
  FOR SELECT USING (TRUE);

-- Only service role can write
CREATE POLICY "listings_service_write" ON listings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "market_snapshots_service_write" ON market_snapshots
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "scrape_logs_service_write" ON scrape_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Saved searches: users manage their own
CREATE POLICY "saved_searches_own" ON saved_searches
  FOR ALL USING (
    auth.uid() = user_id
    OR session_id = current_setting('app.session_id', TRUE)
  );
