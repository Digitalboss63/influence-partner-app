# Database Schema — Influence Partner App

**Version:** Phase 2.0 — Sprint 1 Implemented  
**Engine:** PostgreSQL via Drizzle ORM  
**Drizzle schema:** `lib/db/src/schema/index.ts`  
**Push command:** `pnpm --filter @workspace/db run push`  
**Date updated:** 2026-06-03

> **Sprint 1 Status:** All 7 tables below are **live in Postgres** (pushed and seeded).  
> Tables marked 🔜 are planned for future sprints and are not yet created.

---

## Design Principles

1. **Every entity is user-scoped.** `user_id` FK on all primary tables.
2. **Pipeline is per product, not per creator.** A creator can be in different stages for different products simultaneously.
3. **Intelligence is versioned.** Re-running analysis on a product produces a new snapshot, never overwrites.
4. **Audit trail is first-class.** Stage changes, deal activations, and message sends are all event-sourced.
5. **Computed fields stay in the DB or app layer.** Fit scores are computed at query time or cached in `creator_scores` — never stored on the creator record itself.

---

## Tables

### `users`

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  password_hash TEXT,                    -- nullable if using OAuth
  plan          TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'agency'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Notes:**
- `password_hash` is nullable to support future OAuth (Google, GitHub).
- `plan` gates feature access (discovery API, LLM calls, team seats).

---

### `products`

```sql
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  website           TEXT,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL,       -- matches CategoryKey enum
  target_customer   TEXT NOT NULL,
  main_benefit      TEXT NOT NULL,
  price             TEXT NOT NULL,       -- display string, e.g. "$49/mo"
  price_usd_monthly NUMERIC(10,2),       -- parsed numeric for calculations
  commission_offer  SMALLINT NOT NULL,   -- percentage 20–50
  status            TEXT NOT NULL DEFAULT 'active',  -- 'draft' | 'active' | 'archived'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_status ON products(user_id, status);
```

---

### `product_intelligence_snapshots`

Versioned intelligence results. One product can have many snapshots (re-analysis over time).

```sql
CREATE TABLE product_intelligence_snapshots (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Market
  main_market                     TEXT NOT NULL,
  sub_market                      TEXT NOT NULL,
  -- Buyer persona (stored as JSON)
  buyer_persona                   JSONB NOT NULL,
  /*
    buyer_persona shape:
    {
      age: string,
      gender: string,
      interests: string[],
      painPoints: string[],
      platforms: string[]
    }
  */
  -- Creator targeting
  recommended_creator_categories  JSONB NOT NULL,   -- CreatorCategoryRec[]
  recommended_platforms           TEXT[] NOT NULL,
  recommended_commission_range    TEXT NOT NULL,
  -- Strategy (LLM-generated in Phase 2)
  outreach_angle                  TEXT NOT NULL,
  why_these_creators              TEXT NOT NULL,
  -- Market assessment
  market_difficulty               TEXT NOT NULL,    -- 'Low'|'Medium'|'High'|'Very High'
  market_difficulty_reason        TEXT NOT NULL,
  competition_level               TEXT NOT NULL,    -- 'Fragmented'|'Moderate'|'Competitive'|'Saturated'
  competition_reason              TEXT NOT NULL,
  campaign_opportunity_rating     TEXT NOT NULL,    -- 'Exceptional'|'Strong'|'Moderate'|'Weak'
  campaign_opportunity_reason     TEXT NOT NULL,
  -- Revenue
  revenue_potential_label         TEXT NOT NULL,
  revenue_potential_monthly       TEXT NOT NULL,
  revenue_potential_reason        TEXT NOT NULL,
  estimated_partner_acquisition   TEXT NOT NULL,
  partner_acquisition_reason      TEXT NOT NULL,
  -- Metadata
  engine_version                  TEXT NOT NULL DEFAULT '1.0',  -- bump when logic changes
  llm_model_used                  TEXT,            -- null = template, 'gpt-4o-mini' = LLM
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intel_product_id ON product_intelligence_snapshots(product_id);
CREATE INDEX idx_intel_created_at ON product_intelligence_snapshots(product_id, created_at DESC);
```

**Notes:**
- Frontend always displays the **latest** snapshot by `created_at DESC LIMIT 1`.
- Older snapshots are retained for diff/comparison features in Phase 3.
- `engine_version` lets you invalidate cached results when the scoring model changes.

---

### `creators`

```sql
CREATE TABLE creators (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Identity
  name                    TEXT NOT NULL,
  handle                  TEXT NOT NULL,
  platform                TEXT NOT NULL,   -- 'YouTube' | 'Instagram' | 'TikTok'
  avatar_url              TEXT,
  profile_url             TEXT,
  -- Classification
  niche                   TEXT NOT NULL,
  creator_type            TEXT NOT NULL,   -- 'Micro' | 'Mid-Tier' | 'Macro' | 'Celebrity'
  -- Platform stats (refreshable)
  follower_count          INTEGER NOT NULL DEFAULT 0,
  engagement_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,  -- percentage
  avg_views_per_post      INTEGER,
  posts_per_month         SMALLINT,
  -- Raw scoring inputs (global, not product-specific)
  platform_fit            SMALLINT NOT NULL DEFAULT 50,      -- 0–100
  competitive_conflict    SMALLINT NOT NULL DEFAULT 0,       -- 0–100
  -- Qualitative fields
  audience_fit_summary    TEXT,
  platform_fit_summary    TEXT,
  engagement_quality      TEXT,
  competitor_signal       TEXT,
  why_good_fit            TEXT,
  -- Source tracking
  source                  TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'csv_import' | 'youtube_api' | 'instagram_api' | 'tiktok_api'
  external_id             TEXT,       -- platform-native channel/user ID
  -- Timestamps
  stats_refreshed_at      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creators_user_id ON creators(user_id);
CREATE INDEX idx_creators_platform ON creators(user_id, platform);
CREATE INDEX idx_creators_niche ON creators(user_id, niche);
CREATE UNIQUE INDEX idx_creators_external ON creators(user_id, platform, external_id) WHERE external_id IS NOT NULL;
```

---

### `creator_scores`

Per-product computed fit scores. Separates static creator data from dynamic scoring.

```sql
CREATE TABLE creator_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- Score components
  audience_match      SMALLINT NOT NULL,    -- 0–100
  product_fit         SMALLINT NOT NULL,    -- 0–100
  platform_fit        SMALLINT NOT NULL,    -- 0–100
  engagement_score    SMALLINT NOT NULL,    -- 0–100 (derived from engagement_rate)
  conflict_score      SMALLINT NOT NULL,    -- 0–100 (inverted competitive_conflict)
  -- Composite
  fit_score           SMALLINT NOT NULL,    -- 0–100 weighted composite
  fit_label           TEXT NOT NULL,        -- 'Excellent Partner' | 'Strong Fit' | 'Possible Fit' | 'Low Priority'
  opportunity_level   TEXT NOT NULL,        -- 'Strong Opportunity' | 'Moderate Opportunity' | 'Low Opportunity'
  -- Recommendations
  suggested_commission    TEXT NOT NULL,
  recommended_deal        TEXT NOT NULL,
  suggested_outreach_angle TEXT,
  product_gap_opportunity  TEXT,
  -- Metadata
  scoring_version     TEXT NOT NULL DEFAULT '1.0',
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(creator_id, product_id)  -- one score per creator-product pair
);

CREATE INDEX idx_scores_product ON creator_scores(product_id, fit_score DESC);
CREATE INDEX idx_scores_creator ON creator_scores(creator_id);
```

**Notes:**
- `UNIQUE(creator_id, product_id)` — upsert on re-score.
- `scoring_version` allows cache invalidation when the scoring algorithm changes.

---

### `campaigns`

The operational unit that links a product to a creator recruitment drive.

```sql
CREATE TABLE campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,         -- e.g. "Q3 2026 Productivity Push"
  status              TEXT NOT NULL DEFAULT 'active',  -- 'draft' | 'active' | 'completed' | 'paused'
  target_creator_count INTEGER,
  target_platforms    TEXT[],
  start_date          DATE,
  end_date            DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_user_product ON campaigns(user_id, product_id);
```

---

### `pipeline_entries`

The join between a creator and a product campaign. Replaces `creator.pipelineStage`.

```sql
CREATE TABLE pipeline_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id    UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'New',
  -- 'New' | 'Contacted' | 'Interested' | 'Negotiating' | 'Active' | 'Rejected'
  notes         TEXT,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(campaign_id, creator_id)
);

CREATE INDEX idx_pipeline_campaign ON pipeline_entries(campaign_id, current_stage);
CREATE INDEX idx_pipeline_creator ON pipeline_entries(creator_id);
```

---

### `pipeline_events`

Immutable audit log of every stage transition.

```sql
CREATE TABLE pipeline_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      UUID NOT NULL REFERENCES pipeline_entries(id) ON DELETE CASCADE,
  from_stage    TEXT,      -- null for the initial 'New' entry
  to_stage      TEXT NOT NULL,
  note          TEXT,      -- optional context ("Sent email, got reply")
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_events_entry ON pipeline_events(entry_id, created_at DESC);
```

---

### `deal_terms`

Captured when a creator moves to "Active" stage.

```sql
CREATE TABLE deal_terms (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id                UUID NOT NULL REFERENCES pipeline_entries(id) ON DELETE CASCADE,
  commission_pct          SMALLINT NOT NULL,
  deal_type               TEXT NOT NULL,   -- 'Revenue Share' | 'CPA' | 'Flat Fee' | 'Hybrid'
  flat_fee_usd            NUMERIC(10,2),
  monthly_minimum_usd     NUMERIC(10,2),
  deal_start_date         DATE NOT NULL,
  deal_end_date           DATE,
  exclusivity             BOOLEAN NOT NULL DEFAULT false,
  contract_url            TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### `outreach_messages`

Persisted outreach. No longer ephemeral.

```sql
CREATE TABLE outreach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        UUID NOT NULL REFERENCES pipeline_entries(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,    -- 'Email' | 'Instagram DM' | 'TikTok DM' | 'YouTube Sponsorship'
  tone            TEXT NOT NULL,    -- 'Direct' | 'Friendly' | 'Professional' | 'High-Commission Offer'
  subject_line    TEXT,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'sent' | 'replied' | 'ignored'
  sent_at         TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  generation_method TEXT NOT NULL DEFAULT 'template',  -- 'template' | 'llm'
  llm_model_used  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outreach_entry ON outreach_messages(entry_id);
CREATE INDEX idx_outreach_status ON outreach_messages(entry_id, status);
```

---

## Entity Relationship Summary

```
users
  └── products
        └── product_intelligence_snapshots (many, versioned)
        └── campaigns
              └── pipeline_entries  (creator × campaign)
                    └── pipeline_events (audit trail)
                    └── deal_terms (at activation)
                    └── outreach_messages (per outreach attempt)

users
  └── creators
        └── creator_scores (per product, computed)
```

---

## Drizzle Schema Location

The Drizzle schema should live in `lib/db/schema.ts` (shared lib, imported by `api-server`).

Migration files: `lib/db/migrations/`  
Push command (dev): `pnpm --filter @workspace/db run push`  
Generate migrations: `pnpm --filter @workspace/db run generate`

---

## Indexing Strategy

- All user-scoped queries include `user_id` in the WHERE clause → index every FK to `users.id` with a covering index on the most common filter.
- `creator_scores` is the hottest table during Creator Discovery (full-table scan per product). Index on `(product_id, fit_score DESC)` supports the default sort order.
- `pipeline_events` is append-only and high-volume. Partition by month in Phase 3 if volume exceeds 100K rows.

---

## Seeding Strategy (Phase 2 Dev)

Keep the existing `mockCreators.ts` and `mockProducts.ts` data as seed data. On first login for a new user, run a seed migration that inserts the 15 mock creators and 3 mock products as their starting data, pre-scored against the active product.
