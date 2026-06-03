# Database Schema — Influence Partner App

**Last Updated:** 2026-06-02  
**Driver:** PostgreSQL via `pg`  
**ORM:** Drizzle ORM  
**Schema files:** `lib/db/src/schema/`

---

## Tables

### `products`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | e.g. `p1`, `prod_abc123` |
| `name` | TEXT NOT NULL | |
| `website` | TEXT NOT NULL | |
| `description` | TEXT NOT NULL | |
| `category` | TEXT NOT NULL | e.g. "Productivity", "Fitness" |
| `target_customer` | TEXT NOT NULL | Free-form description |
| `main_benefit` | TEXT NOT NULL | Core value proposition |
| `price` | TEXT NOT NULL | e.g. "$49/mo" |
| `commission_offer` | REAL NOT NULL | Percentage, e.g. 35 |
| `status` | TEXT NOT NULL | `draft` \| `active` \| `archived` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `product_intelligence_snapshots`

Versioned cache of product analysis. Each re-analysis creates a new row (version++).\
LLM-backed fields will populate here in Phase 2B.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `product_id` | TEXT FK → products | CASCADE delete |
| `version` | INTEGER | Increments on refresh |
| `main_market` | TEXT | |
| `sub_market` | TEXT | |
| `main_niche` | TEXT | |
| `sub_niches` | JSONB | `string[]` |
| `ideal_creator_types` | JSONB | `string[]` |
| `recommended_platforms` | JSONB | `string[]` |
| `buyer_persona` | JSONB | `BuyerPersona` object |
| `recommended_creator_categories` | JSONB | `CreatorCategoryRec[]` |
| `outreach_angle` | TEXT | |
| `why_these_creators` | TEXT | |
| `market_difficulty` | TEXT | |
| `competition_level` | TEXT | |
| `campaign_opportunity_rating` | TEXT | |
| `revenue_potential_label` | TEXT | |
| `revenue_potential_monthly` | TEXT | |
| `recommended_commission_range` | TEXT | |
| `source` | TEXT | `deterministic` \| `llm` \| `manual` |
| `created_at` | TIMESTAMPTZ | |

---

### `creators`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `name` | TEXT NOT NULL | |
| `handle` | TEXT NOT NULL | e.g. `@techwithtara` |
| `platform` | TEXT NOT NULL | `YouTube` \| `Instagram` \| `TikTok` |
| `niche` | TEXT NOT NULL | |
| `creator_type` | TEXT NOT NULL | `Micro` \| `Mid-Tier` \| `Macro` \| `Celebrity` |
| `follower_count` | INTEGER | |
| `engagement_rate` | REAL | Percentage, e.g. `8.5` |
| `avatar_url` | TEXT | |
| `audience_match` | INTEGER | Raw score 0–100 (input dimension) |
| `platform_fit` | INTEGER | Raw score 0–100 (input dimension) |
| `product_fit` | INTEGER | Raw score 0–100 (input dimension) |
| `competitive_conflict` | INTEGER | 0–100 (inverted for scoring) |
| `audience_fit_summary` | TEXT | |
| `platform_fit_summary` | TEXT | |
| `engagement_quality` | TEXT | |
| `competitor_signal` | TEXT | |
| `product_gap_opportunity` | TEXT | |
| `why_good_fit` | TEXT | |
| `suggested_deal_structure` | TEXT | |
| `suggested_outreach_angle` | TEXT | |
| `recommended_deal` | TEXT | |
| `source` | TEXT | `manual` \| `discovered` \| `imported` |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `creator_scores`

> **CRITICAL DESIGN RULE:** Scores are ALWAYS per-product. There are no global fit scores.
> A creator who scores 92 for a fitness app may score 34 for a finance app.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `creator_id` | TEXT FK → creators | CASCADE delete |
| `product_id` | TEXT FK → products | CASCADE delete |
| `fit_score` | REAL | 0–100 composite |
| `audience_match` | REAL | Normalized input |
| `platform_fit` | REAL | Normalized input |
| `product_fit` | REAL | Normalized input |
| `engagement_score` | REAL | `min(engRate * 10, 100)` |
| `conflict_score` | REAL | `100 - competitiveConflict` |
| `fit_label` | TEXT | `Excellent Partner` \| `Strong Fit` \| `Possible Fit` \| `Low Priority` |
| `suggested_commission` | TEXT | e.g. `35–40%` |
| `scoring_method` | TEXT | `formula` \| `llm` \| `manual_override` |
| `score_notes` | TEXT | |
| `computed_at` | TIMESTAMPTZ | |

**Score formula (Phase 2A):**
```
fitScore = audienceMatch*0.30 + engScore*0.20 + platformFit*0.15 + productFit*0.20 + conflictScore*0.15
```

---

### `pipeline_entries`

One entry per creator × product pair. Stage is current, history is in `pipeline_events`.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `product_id` | TEXT FK → products | CASCADE |
| `creator_id` | TEXT FK → creators | CASCADE |
| `stage` | TEXT NOT NULL | `New` \| `Contacted` \| `Interested` \| `Negotiating` \| `Active` \| `Rejected` |
| `notes` | TEXT | Internal notes |
| `proposed_rate` | REAL | USD/month |
| `agreed_rate` | REAL | Final signed rate |
| `deal_type` | TEXT | `Revenue Share` \| `CPA` \| `Flat Fee` \| `Hybrid` |
| `deal_start_date` | TIMESTAMPTZ | |
| `deal_end_date` | TIMESTAMPTZ | |
| `priority` | TEXT | `High` \| `Medium` \| `Low` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `pipeline_events`

Immutable audit log. One row per stage transition.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `pipeline_entry_id` | TEXT FK → pipeline_entries | CASCADE |
| `from_stage` | TEXT | null for initial entry |
| `to_stage` | TEXT NOT NULL | |
| `note` | TEXT | Optional context |
| `metadata` | JSONB | Future extensibility |
| `changed_at` | TIMESTAMPTZ | |

---

### `outreach_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `pipeline_entry_id` | TEXT FK → pipeline_entries | SET NULL on delete |
| `creator_id` | TEXT FK → creators | CASCADE |
| `product_id` | TEXT FK → products | CASCADE |
| `subject` | TEXT | Email subject line |
| `body` | TEXT NOT NULL | Message body |
| `tone` | TEXT | `Direct` \| `Friendly` \| `Professional` \| `High-Commission Offer` |
| `channel` | TEXT | `Email` \| `Instagram DM` \| `TikTok DM` \| `YouTube Sponsorship` |
| `status` | TEXT | `draft` \| `sent` \| `replied` \| `ignored` |
| `generation_method` | TEXT | `template` \| `llm` |
| `sent_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## Entity Relationships

```
products ──< product_intelligence_snapshots
products ──< creator_scores >── creators
products ──< pipeline_entries >── creators
pipeline_entries ──< pipeline_events
pipeline_entries ──< outreach_messages
```

---

## Future Tables (Phase 2B+)

| Table | When | Purpose |
|---|---|---|
| `users` | Sprint 2 | Authentication — every entity gets `user_id` FK |
| `campaigns` | Sprint 3 | Campaign = product + date range + targets |
| `deal_terms` | Sprint 3 | Signed deal capture at Active stage |
| `platform_profiles` | Sprint 4 | YouTube/IG/TikTok metadata per creator |
