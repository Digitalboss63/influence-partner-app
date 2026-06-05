# Phase 6A — Campaign Management

## Overview

Full campaign management lifecycle for the Influence Partner App. Campaigns are the primary coordination unit for activating influencer partnerships — tying a product to a set of creators, a budget, and time-bound goals.

---

## Features

### Campaign List (`/campaigns`)
- Summary metric cards: total campaigns, active campaigns, total budget, total creators assigned
- Per-campaign cards showing name, linked product, status badge, campaign type badge, budget vs committed vs spent, creator count, and date range
- **Campaign Type badge** displayed for all non-`custom` types (awareness, affiliate, sponsorship, launch, review)
- Filter bar: search by name, filter by status and/or product
- "Create Campaign" dialog with all fields including campaign type selector

### Campaign Detail (`/campaigns/:id`)
- Header with editable status dropdown, quick-access action buttons
- Objective, campaign type, description, budget/creator metrics
- Creator assignments table with assignment status tracking
- Timeline view (milestone cards)
- Budget breakdown panel
- Performance summary card

### Create Campaign Dialog
Fields:
- **Name** (required)
- **Objective** (required)
- **Product** (optional link to a product)
- **Campaign Type** — `awareness | affiliate | sponsorship | launch | review | custom` (defaults to `custom`)
- **Budget** ($)
- **Target Creator Count**
- **Description**
- **Start Date / End Date**

---

## Campaign Types

| Type | Use Case |
|------|----------|
| `awareness` | Top-of-funnel brand reach campaigns |
| `affiliate` | Commission-driven performance campaigns |
| `sponsorship` | Paid placement / dedicated sponsored content |
| `launch` | New product or feature launch coordination |
| `review` | Product review seeding |
| `custom` | Catch-all for custom arrangements |

---

## Data Model

**Table: `campaigns`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `product_id` | UUID | FK → products |
| `name` | text | required |
| `description` | text | optional |
| `objective` | text | required |
| `campaign_type` | enum | `awareness\|affiliate\|sponsorship\|launch\|review\|custom`, default `custom` |
| `budget` | integer | cents or dollars |
| `target_creator_count` | integer | |
| `assigned_creator_count` | integer | maintained by API |
| `status` | enum | `planning\|active\|paused\|completed\|cancelled` |
| `start_date` | timestamp | optional |
| `end_date` | timestamp | optional |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Table: `campaign_creators`**

Joins campaigns ↔ partner targets with assignment status, budget allocation, and performance tracking.

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/campaigns` | List all campaigns (with product name join, budget/creator aggregates) |
| `POST` | `/api/campaigns` | Create campaign |
| `GET` | `/api/campaigns/metrics` | Aggregate metrics (total, active, budget, creators) |
| `GET` | `/api/campaigns/:id` | Single campaign detail |
| `PATCH` | `/api/campaigns/:id` | Update campaign fields |
| `DELETE` | `/api/campaigns/:id` | Delete campaign |
| `GET` | `/api/campaigns/:id/timeline` | Timeline milestones for a campaign |
| `POST` | `/api/campaigns/:id/creators/bulk` | Bulk-add creators to campaign |

All campaign create/update routes accept `campaignType` in the request body.

---

## Frontend Integration

- `src/pages/Campaigns.tsx` — list, filter, create dialog with campaign type
- `src/pages/CampaignDetail.tsx` — detail view with type display
- `src/lib/api-client.ts` — `CampaignType` union, `ApiCampaign.campaignType`, `CreateCampaignPayload.campaignType`
- `src/pages/HelpCampaignManagement.tsx` — contextual help at `/help/campaign-management`
- Route registered in `App.tsx`; nav entry in `Layout.tsx`

---

## Help Page

`/help/campaign-management` covers:

1. What is a campaign?
2. Campaign lifecycle (planning → active → completed)
3. Adding creators
4. Setting deliverables
5. Budget tracking
6. Measuring success
7. Campaign types
8. Best practices

