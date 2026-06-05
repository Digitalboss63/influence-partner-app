# Phase 6A — Campaign Management

**Commit base:** 3d75f860 (Phase 5D Executive Reporting)

## Goal

Allow users to create, manage, and track influencer campaigns as an orchestration layer over the existing Discovery → Qualification → Targets → Outreach → Pipeline → Performance → Reporting workflow.

## DB Changes

### New enums
- `campaign_status`: planning | active | paused | completed | cancelled
- `assignment_status`: identified | contacted | interested | negotiating | contracted | completed | declined

### New tables
- `campaigns`: id, product_id, name, description, objective, budget, target_creator_count, assigned_creator_count, status, start_date, end_date, created_at, updated_at
- `campaign_creators`: id, campaign_id, target_id, creator_name, assignment_status, deliverables (jsonb string[]), estimated_value, actual_value, notes, created_at, updated_at

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/campaigns/metrics | Aggregate KPIs (before /:id to avoid path clash) |
| GET | /api/campaigns | List all campaigns with budget/creator rollups |
| GET | /api/campaigns/:id | Campaign detail with creators, outreach rollup, revenue |
| POST | /api/campaigns | Create campaign |
| PATCH | /api/campaigns/:id | Update campaign |
| DELETE | /api/campaigns/:id | Delete campaign (cascades creators) |
| POST | /api/campaigns/:id/add-creator | Assign creator to campaign |
| PATCH | /api/campaigns/creator/:id | Update campaign creator (status, deliverables, values) |

## UI Routes

| Path | Component | Description |
|------|-----------|-------------|
| /campaigns | Campaigns | List page with KPI tiles + campaign cards |
| /campaigns/:id | CampaignDetail | Detail with 7 sections |
| /help/campaign-management | HelpCampaignManagement | How-it-works guide |

## Key Decisions

- `GET /api/campaigns/metrics` registered before `GET /api/campaigns/:id` — Express route ordering prevents "metrics" being treated as an :id
- `assignedCreatorCount` on campaigns is synced server-side after every add-creator or update-creator mutation
- Outreach rollup in detail view queries `outreach_operations` by creator name (existing table, no schema change)
- Revenue in detail view queries `creator_performance.actual_revenue` by creator name
- Budget committed = sum of estimated_value for non-declined creators; budget used = sum of actual_value
- Deliverables stored as `jsonb string[]` — flexible for Video, Short, Post, Story, Review, Custom
- Campaign ROI = (budget_used / budget_committed) * 100 when committed > 0
- Nav item "Campaigns" added after Dashboard and Products (position 3) — campaign is the workflow entry point
