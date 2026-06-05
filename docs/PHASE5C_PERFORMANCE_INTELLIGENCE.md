# Phase 5C — Performance Intelligence

## Purpose

Performance Intelligence is the measurement and attribution layer of the Influence Partner workflow. It aggregates live data from Outreach Operations to answer: which creators perform best, which channels convert, which products generate partnerships, and where revenue is coming from.

No automation, AI, or payment integrations are used. All analytics are rule-based computations on logged outreach activity.

---

## Workflow Position

```
Product → Strategy → Discovery → Qualification → Contact Intelligence
  → Targets → Outreach Operations
  → Performance Intelligence → Pipeline
```

---

## Data Model

### Table: `creator_performance`

Stores manual revenue entries + optional score snapshots for creators.
All count metrics (sent, replied, etc.) are computed live from `outreach_operations`.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `target_id` | UUID (nullable, FK → partner_targets) | Linked target |
| `product_id` | UUID (nullable, FK → products, cascade) | Product context |
| `creator_name` | TEXT NOT NULL | Creator identifier |
| `partner_fit_score` | INTEGER | Optional stored fit score |
| `contact_readiness_score` | INTEGER | Optional stored contact readiness |
| `outreach_sent_count` | INTEGER default 0 | Stored snapshot (not live) |
| `reply_count` | INTEGER default 0 | Stored snapshot (not live) |
| `interested_count` | INTEGER default 0 | Stored snapshot (not live) |
| `negotiation_count` | INTEGER default 0 | Stored snapshot (not live) |
| `conversion_count` | INTEGER default 0 | Stored snapshot (not live) |
| `estimated_revenue` | REAL | Manual estimated revenue ($) |
| `actual_revenue` | REAL | Manual actual revenue ($) |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

### Table: `campaign_performance`

Stores manual revenue entries for product-level campaigns.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `product_id` | UUID (nullable, FK → products, cascade) | Linked product |
| `campaign_name` | TEXT NOT NULL | Product name or custom campaign name |
| `outreach_count` | INTEGER default 0 | Stored snapshot |
| `replies` | INTEGER default 0 | Stored snapshot |
| `interested` | INTEGER default 0 | Stored snapshot |
| `negotiations` | INTEGER default 0 | Stored snapshot |
| `conversions` | INTEGER default 0 | Stored snapshot |
| `conversion_rate` | REAL | Stored snapshot |
| `estimated_revenue` | REAL | Manual estimated revenue ($) |
| `actual_revenue` | REAL | Manual actual revenue ($) |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

---

## Architecture Note

**Live aggregation from `outreach_operations`**: Most performance metrics (sent count, reply count, conversion rate, funnel stages) are computed at query time by pulling all outreach_operations records and aggregating in JavaScript. This ensures the data is always in sync with current outreach state.

**Revenue storage in `creator_performance` / `campaign_performance`**: Only `estimated_revenue` and `actual_revenue` are persisted. These are entered manually by the user via the UI's pencil-icon editor. An upsert pattern is used (find by creatorName+productId, update if exists, insert if not).

This separation avoids data duplication and makes the system self-healing — any status change in outreach_operations immediately reflects in performance metrics on the next page load.

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/performance/overview` | Overall metrics + funnel data |
| `GET` | `/api/performance/creators` | Creator leaderboard with aggregated metrics |
| `GET` | `/api/performance/products` | Product-level performance |
| `GET` | `/api/performance/channels` | Channel breakdown (Email vs DM vs LinkedIn) |
| `GET` | `/api/performance/insights` | Rule-based text insights |
| `PATCH` | `/api/performance/creators/revenue` | Upsert creator revenue (estimated + actual) |
| `PATCH` | `/api/performance/products/revenue` | Upsert product/campaign revenue |

### Query Parameters

All GET routes accept `?productId=<uuid>` to filter to a specific product.

### GET /api/performance/overview Response Shape

```json
{
  "total": 42,
  "sent": 28,
  "replied": 12,
  "interested": 7,
  "negotiating": 3,
  "converted": 2,
  "replyRate": 42.9,
  "interestedRate": 58.3,
  "conversionRate": 7.1,
  "overallConversionRate": 4.8,
  "totalEstimatedRevenue": 15000,
  "totalActualRevenue": 0,
  "funnel": [
    { "stage": "Total Operations", "count": 42, "pct": 100 },
    { "stage": "Sent", "count": 28, "pct": 66.7 },
    { "stage": "Replied", "count": 12, "pct": 42.9 },
    { "stage": "Interested", "count": 7, "pct": 58.3 },
    { "stage": "Negotiating", "count": 3, "pct": 42.9 },
    { "stage": "Converted", "count": 2, "pct": 66.7 }
  ]
}
```

---

## Conversion Rate Benchmarks

| Range | Rating | Interpretation |
|---|---|---|
| ≥ 20% | Excellent | Targeting and messaging are well-aligned |
| 10–19% | Good | Solid; room to improve follow-up |
| 5–9% | Average | Review messaging or creator targeting |
| < 5% | Low | Significant improvement needed |

---

## Funnel Stages

The performance funnel mirrors the outreach_operations status machine:

```
Total Operations → Sent → Replied → Interested → Negotiating → Converted
```

Each stage's percentage is computed relative to the **previous stage** (not total), showing the step-by-step conversion at each transition.

---

## Rule-Based Insights

The `/api/performance/insights` endpoint generates up to 5 insights:

1. **Channel insight** — Which contact method produces the highest reply rate, with multiplier if comparison is possible.
2. **Creator insight** — Top converting creator by name with conversion rate.
3. **Funnel insight** — Whether reply-to-interested rate is low (< 30%) or strong (≥ 60%), with actionable suggestion.
4. **Priority insight** — Whether high-priority operations outperform medium-priority ones.
5. **Volume insight** — Whether top creators are concentrated (top 3 account for ≥ 50% of conversions).

Insights require minimum data thresholds:
- Channel insight: ≥ 2 channels with sent operations
- Creator insight: ≥ 1 converted creator
- Funnel insight: ≥ 3 replied operations
- Priority insight: both high and medium priority groups with sent operations

---

## UI Routes

| Route | Component | Description |
|---|---|---|
| `/performance` | `PerformanceIntelligence.tsx` | Main dashboard |
| `/help/performance-intelligence` | `HelpPerformanceIntelligence.tsx` | 7-section help guide |

---

## Performance Page Sections

### 1. Summary Tiles (6 tiles)
Total Operations, Sent, Reply Rate, Conversions, Conversion Rate, Total Revenue

### 2. Insights Panel
Rule-based observations. Only shown when data is available.

### 3. Funnel Conversion Analysis
Visual bar chart of all 6 funnel stages with counts and step-by-step conversion percentages.

### 4. Channel Analysis
Reply rate and conversion rate bars per contact method.

### 5. Creator Leaderboard
Table sorted by conversions. Shows: rank, name, sent/replies/conversions, conversion rate, revenue.
- Inline revenue editor (pencil icon) per row
- Shows top 10 by default; expandable

### 6. Product Performance
Table of all products showing outreach, conversion rate, and revenue.
- Inline revenue editor per row

### 7. Revenue Tracking Note
Explains manual-entry-only approach.

---

## Navigation

New nav item: **Performance** (TrendingUp icon) between Outreach Operations and Pipeline.

Full nav order:
```
Dashboard → Products → Discover Creators → Partner Strategy
→ Discovery Workspace → YouTube Discovery → Qualification
→ Contact Intelligence → Targets → Outreach → Outreach Operations
→ Performance → Pipeline
```

---

## Verification Checklist

- [x] TypeScript 0 errors (all 4 packages)
- [x] `creator_performance` table created
- [x] `campaign_performance` table created
- [x] DB schema pushed
- [x] 7 API routes registered and responding
- [x] `/performance` page loads with 6 tiles, 4 sections
- [x] `/help/performance-intelligence` page loads with 7-section guide
- [x] Empty state handled gracefully (no crashes on empty data)
- [x] Revenue editor (estimated + actual) works per creator and product
- [x] Funnel visualization renders
- [x] Channel analysis renders
- [x] Creator leaderboard renders (empty state + data state)
- [x] Product performance renders
- [x] Insights appear when data is available
- [x] Nav item added (Performance between Outreach Operations and Pipeline)
- [x] No regressions on Qualification, Contact Intelligence, Targets, Outreach Operations, Pipeline

---

## Known Limitations

- No time-series charts (conversions over time)
- No A/B test comparison across message variants
- Revenue is not linked to actual payment data
- Creator niche data not used in segmentation (niche not stored in outreach_operations)
- No CSV export of performance reports (Phase 5D)
- Multi-touch attribution not supported — last-touch only
- Insights require minimum data thresholds; sparse data produces no insights

---

## Phase 5D Dependencies

1. **Time-series charts** — weekly conversion trends, reply rate trends over time
2. **Niche segmentation** — requires niche field on outreach_operations
3. **CSV export** — download performance report as spreadsheet
4. **Goal setting** — set target conversion rates and track progress
5. **Creator scoring integration** — pull fit_score from contact_intelligence into leaderboard
6. **Real revenue tracking** — optional Stripe webhook integration for actual payout data
