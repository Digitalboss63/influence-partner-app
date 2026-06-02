# Database Schema — Influence Partner App

**Last Updated:** 2026-06-02  
**Driver:** sql.js (SQLite WASM)  
**ORM:** Drizzle ORM  
**Schema file:** `server/db/schema.ts`

---

## Overview

All timestamps are stored as `INTEGER` (Unix milliseconds epoch).  
All JSON fields are stored as `TEXT` (serialized, deserialized in route handlers).  
All boolean fields are stored as `INTEGER` (0 = false, 1 = true).

---

## Tables

### `products`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Prefix: `prod_` |
| `name` | TEXT | NOT NULL | |
| `description` | TEXT | NOT NULL | |
| `category` | TEXT | NOT NULL | e.g. "Beauty & Skincare" |
| `price` | REAL | NOT NULL | USD |
| `url` | TEXT | | Product page URL |
| `image_url` | TEXT | | |
| `target_audience` | TEXT | | Free-form description |
| `key_benefits` | TEXT | | JSON array of strings |
| `created_at` | INTEGER | NOT NULL | Unix ms |
| `updated_at` | INTEGER | NOT NULL | Unix ms |

---

### `product_intelligence_snapshots`

Versioned cache of AI/computed analysis per product. LLM calls will write here in Phase 2B.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Format: `snap_<product_id>` |
| `product_id` | TEXT | FK → products.id CASCADE | |
| `version` | INTEGER | DEFAULT 1 | Increment on refresh |
| `target_audience_analysis` | TEXT | | Free-form analysis |
| `content_angles` | TEXT | | JSON array of strings |
| `competitor_landscape` | TEXT | | Free-form |
| `pricing_position` | TEXT | | Free-form |
| `best_creator_profile` | TEXT | | JSON object: `{niches, platforms, minFollowers}` |
| `source` | TEXT | DEFAULT 'mock' | `"mock"` \| `"llm"` \| `"manual"` |
| `created_at` | INTEGER | NOT NULL | Unix ms |

---

### `creators`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Prefix: `cre_` |
| `name` | TEXT | NOT NULL | |
| `handle` | TEXT | NOT NULL | e.g. `@ariaglows` |
| `platform` | TEXT | NOT NULL | `"instagram"` \| `"youtube"` \| `"tiktok"` \| `"twitter"` \| `"other"` |
| `niche` | TEXT | NOT NULL | |
| `follower_count` | INTEGER | DEFAULT 0 | |
| `engagement_rate` | REAL | DEFAULT 0 | Percentage, e.g. `4.2` |
| `avg_views` | INTEGER | | Per post/video |
| `avg_likes` | INTEGER | | |
| `location` | TEXT | | |
| `email` | TEXT | | Contact email |
| `bio` | TEXT | | |
| `profile_image_url` | TEXT | | |
| `tags` | TEXT | | JSON array of strings |
| `audience_demographics` | TEXT | | JSON: `{ageRange, genderSplit, topLocations}` |
| `price_range` | TEXT | | e.g. `"$500-$2,000"` |
| `is_verified` | INTEGER | DEFAULT 0 | 0 or 1 |
| `created_at` | INTEGER | NOT NULL | Unix ms |
| `updated_at` | INTEGER | NOT NULL | Unix ms |

---

### `creator_scores`

**Design intent:** Scores are ALWAYS per-product. There are no global static creator scores.  
A creator may have a high score for a skincare product and a low score for a fitness product.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Format: `score_<creator_id>_<product_id>` |
| `creator_id` | TEXT | FK → creators.id CASCADE | |
| `product_id` | TEXT | FK → products.id CASCADE | |
| `overall_score` | REAL | DEFAULT 0 | 0–100 composite |
| `audience_fit_score` | REAL | DEFAULT 0 | 0–100 |
| `engagement_score` | REAL | DEFAULT 0 | 0–100 |
| `niche_relevance_score` | REAL | DEFAULT 0 | 0–100 |
| `reach_score` | REAL | DEFAULT 0 | 0–100 |
| `scoring_method` | TEXT | DEFAULT 'mock' | `"mock"` \| `"llm"` \| `"formula"` |
| `score_notes` | TEXT | | Human/LLM reasoning |
| `computed_at` | INTEGER | NOT NULL | Unix ms |

**Composite score formula (Phase 2A):**
```
overallScore = (nicheRelevanceScore × 0.35)
             + (engagementScore × 0.30)
             + (reachScore × 0.20)
             + (audienceFitScore × 0.15)
```
Replace formula with LLM calls in Phase 2B.

---

### `pipeline_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Prefix: `pipe_` |
| `product_id` | TEXT | FK → products.id CASCADE | |
| `creator_id` | TEXT | FK → creators.id CASCADE | |
| `status` | TEXT | DEFAULT 'New' | See status enum below |
| `notes` | TEXT | | Internal notes |
| `proposed_rate` | REAL | | USD |
| `agreed_rate` | REAL | | USD |
| `campaign_brief` | TEXT | | Full brief text |
| `expected_delivery_date` | INTEGER | | Unix ms |
| `priority` | INTEGER | DEFAULT 0 | 0–10 |
| `created_at` | INTEGER | NOT NULL | Unix ms |
| `updated_at` | INTEGER | NOT NULL | Unix ms |

**Pipeline Status Enum:**
```
New → Contacted → Interested → Negotiating → Active → Rejected
```

---

### `outreach_messages`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Prefix: `msg_` |
| `pipeline_item_id` | TEXT | FK → pipeline_items.id CASCADE | |
| `creator_id` | TEXT | FK → creators.id CASCADE | |
| `product_id` | TEXT | FK → products.id CASCADE | |
| `subject` | TEXT | | Email subject or DM preview |
| `body` | TEXT | NOT NULL | |
| `channel` | TEXT | DEFAULT 'email' | `"email"` \| `"dm"` \| `"platform"` |
| `direction` | TEXT | DEFAULT 'outbound' | `"outbound"` \| `"inbound"` |
| `status` | TEXT | DEFAULT 'draft' | `"draft"` \| `"sent"` \| `"delivered"` \| `"read"` \| `"replied"` |
| `sent_at` | INTEGER | | Unix ms; null if draft |
| `created_at` | INTEGER | NOT NULL | Unix ms |
| `updated_at` | INTEGER | NOT NULL | Unix ms |

---

## Entity Relationships

```
products ──< product_intelligence_snapshots
products ──< creator_scores >── creators
products ──< pipeline_items >── creators
pipeline_items ──< outreach_messages
```

---

## Future Considerations

- Upgrade to PostgreSQL / Turso (libsql) for production multi-user workloads
- Add `users` table when auth is introduced (Phase 3)
- Add `campaigns` table when campaign management is implemented
- Add indexes on `creator_scores(product_id)`, `pipeline_items(status)`, `pipeline_items(product_id)`
- Add `created_by` / `updated_by` columns when multi-user is introduced
