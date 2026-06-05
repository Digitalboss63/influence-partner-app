# Phase 5D — Executive Reporting & Goal Tracking

## Purpose

Executive Reporting transforms operational data into stakeholder-ready summaries. It provides goal tracking, conversion trend charts, creator and product performance tables, revenue summaries, and four CSV exports — all computed live from existing data with no new data pipelines.

## Workflow Position

```
Product → Strategy → Discovery → Qualification → Contact Intelligence
  → Targets → Outreach Operations → Performance Intelligence
  → Executive Reports → Pipeline
```

---

## Database Changes

### New Enums

| Enum | Values |
|---|---|
| `goal_type` | creators_contacted, replies, interested, negotiations, conversions, estimated_revenue, actual_revenue |
| `goal_status` | on_track, behind, achieved |

### New Table: `performance_goals`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `product_id` | UUID (nullable, FK → products cascade) | Product scope (null = all products) |
| `goal_type` | goal_type enum NOT NULL | Which metric is being tracked |
| `target_value` | REAL NOT NULL | Target number to reach |
| `current_value` | REAL default 0 | Stored snapshot (not live — live value computed at query time) |
| `start_date` | TIMESTAMP nullable | Optional start date for time-scoped goals |
| `end_date` | TIMESTAMP nullable | Optional end date for time-scoped goals |
| `status` | goal_status default on_track | Computed automatically: achieved ≥ 100%, on_track ≥ 50%, behind < 50% |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last update |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/reports/summary` | Executive KPIs + 30-day period comparison |
| `GET` | `/api/reports/trends` | Monthly trend data (last N months) |
| `GET` | `/api/reports/insights` | Priority-ordered executive insights |
| `GET` | `/api/reports/goals` | Goals with live current_value + status |
| `POST` | `/api/reports/goals` | Create goal |
| `PATCH` | `/api/reports/goals/:id` | Update target or date range |
| `DELETE` | `/api/reports/goals/:id` | Remove goal |

### Query Parameters

All GET routes accept `?productId=<uuid>`.
`/api/reports/trends` also accepts `?months=6` or `?months=12`.

### GET /api/reports/summary Response

```json
{
  "totalOps": 42,
  "sent": 28,
  "replied": 12,
  "interested": 7,
  "negotiations": 3,
  "conversions": 2,
  "replyRate": 42.9,
  "interestedRate": 58.3,
  "conversionRate": 7.1,
  "totalEstimatedRevenue": 15000,
  "totalActualRevenue": 2500,
  "productCount": 3,
  "activeCreators": 18,
  "periodComparison": {
    "recentSent": 8,
    "priorSent": 5,
    "recentReplied": 4,
    "priorReplied": 2,
    "recentConversions": 1,
    "priorConversions": 0,
    "replyRateDelta": 10.0,
    "convRateDelta": 12.5
  }
}
```

### GET /api/reports/trends Response

```json
[
  { "period": "2025-01", "label": "Jan 25", "contacted": 3, "replied": 1, "interested": 0, "converted": 0, "total": 4 },
  { "period": "2025-02", "label": "Feb 25", "contacted": 5, "replied": 2, "interested": 1, "converted": 0, "total": 6 }
]
```

### Goal current_value computation

| goal_type | Source |
|---|---|
| creators_contacted | count(outreach_ops where status ∈ {sent, replied, interested, negotiating, converted}) |
| replies | count(outreach_ops where status ∈ {replied, interested, negotiating, converted}) |
| interested | count(outreach_ops where status ∈ {interested, negotiating, converted}) |
| negotiations | count(outreach_ops where status ∈ {negotiating, converted}) |
| conversions | count(outreach_ops where status = converted) |
| estimated_revenue | sum(creator_performance.estimated_revenue) |
| actual_revenue | sum(creator_performance.actual_revenue) |

---

## Executive Insights

Up to 5 priority-ordered insights are generated:

| Priority | Type | Trigger |
|---|---|---|
| High | Period | Reply rate declined ≥ 5pp vs prior 30 days |
| High | Goal | Conversion goal < 50% complete |
| High | Activity | Outreach activity dropped > 50% vs prior period |
| Medium | Goal | Goal 50–80% complete |
| Low | Channel | Best-performing channel by reply rate |
| Low | Creator | Top creator concentration (top 5 as % of conversions) |
| Low | Activity | Outreach activity increased > 20% vs prior period |

Insights are sorted high → medium → low and show as colour-coded cards.

---

## CSV Exports

All four exports are client-side (no server endpoint), generated from currently-loaded data:

| Export | Filename | Content |
|---|---|---|
| Executive Summary | `executive-summary.csv` | All 14 KPI metrics in two columns |
| Creator Performance | `creator-performance.csv` | Full leaderboard (9 columns) |
| Product Performance | `product-performance.csv` | Product metrics (8 columns) |
| Revenue Report | `revenue-report.csv` | Creators + products revenue with totals row |

Exports respect the active product filter. Clear filter for all-product export.

---

## UI Routes

| Route | Component |
|---|---|
| `/performance/reports` | `ExecutiveReports.tsx` |
| `/help/executive-reporting` | `HelpExecutiveReporting.tsx` |

---

## Page Sections

1. **Executive Summary** — 8 KPI tiles with 30-day period delta arrows
2. **Executive Insights** — colour-coded priority insights (red/amber/green)
3. **Goal Progress** — goal cards with progress bar, status badge, inline edit, delete
4. **Conversion Trends** — recharts BarChart (Sent / Replied / Converted by month), 6 or 12 month toggle
5. **Creator Leaderboard** — top 8 creators (full list → Performance page)
6. **Channel Performance** — reply rate bars per contact method
7. **Product Performance** — full product table with conversion rates + revenue
8. **Revenue Summary** — estimated pipeline vs actual earned

---

## Navigation

New nav item: **Executive Reports** (FileBarChart icon) between Performance and Pipeline.

Full nav order (final):
```
Dashboard → Products → Discover Creators → Partner Strategy
→ Discovery Workspace → YouTube Discovery → Qualification
→ Contact Intelligence → Targets → Outreach → Outreach Operations
→ Performance → Executive Reports → Pipeline
```

---

## Verification Checklist

- [x] TypeScript 0 errors (all 4 packages)
- [x] `performance_goals` table created (2 new enums + 1 table)
- [x] 7 API routes registered and responding
- [x] `/performance/reports` page loads with 8 sections
- [x] `/help/executive-reporting` page loads with 8-section guide
- [x] Goal creation works (POST + UI form)
- [x] Goal progress auto-computed from live outreach data
- [x] Goal edit (inline target change) works
- [x] Goal delete works
- [x] Trend chart renders (empty state + data state)
- [x] 4 CSV export buttons functional (client-side Blob generation)
- [x] Period comparison deltas compute correctly
- [x] Executive insights generated when data available
- [x] Nav item added between Performance and Pipeline
- [x] No regressions on all prior pages

---

## Known Limitations

- Goal start/end date entry not exposed in UI (API-only via PATCH)
- Goal on-track threshold is completion-based (not time-adjusted)
- Trend buckets use operation creation date, not status-change date
- No PDF export
- No scheduled report delivery
- No multi-user goal sharing or comments
- Insight period comparison uses 30-day rolling windows (not calendar months)
