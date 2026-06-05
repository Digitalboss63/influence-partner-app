# Phase 4A — Discovery Workspace

## Overview

Introduces a **staging area** for partner prospects before they enter the Targets pipeline. The workflow is now:

```
Partner Strategy
↓
Discovery Workspace   ← Phase 4A
↓
Targets
↓
Outreach
↓
Pipeline
```

You can now research prospects manually today (Quick Capture, CSV import, manual form), qualify them, and promote them to Targets when ready. Future API integrations (YouTube, Modash, etc.) will feed this workspace instead of Targets directly.

---

## Database

### New Enum: `partner_prospect_status`

| Value | Meaning |
|---|---|
| `New Prospect` | Just discovered, no evaluation yet |
| `Qualified` | Evaluated, good fit |
| `Rejected` | Not a fit |
| `Added To Targets` | Promoted to the Targets pipeline |

### New Table: `partner_prospects`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `name` | `text` | Required |
| `company` | `text` | Optional |
| `platform` | `text` | YouTube, Podcast, Blog, etc. |
| `partner_category` | `text` | Optional — pre-fills Add To Targets form |
| `website` | `text` | Optional |
| `email` | `text` | Optional |
| `social_url` | `text` | Optional |
| `audience_size` | `text` | Free-text — "50k", "1.2M" |
| `notes` | `text` | Optional |
| `source` | `text` | `Manual` / `Quick Capture` / `CSV Import` |
| `status` | `partner_prospect_status` | Default: `New Prospect` |
| `user_id` | `text` | Nullable — SaaS-ready |
| `organization_id` | `text` | Nullable — SaaS-ready |
| `created_at` | `timestamp` | Auto |
| `updated_at` | `timestamp` | Auto |

---

## API Routes

Base path: `/api/prospects`

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prospects` | List all; supports `?status`, `?partnerCategory` |
| `POST` | `/api/prospects` | Create; Zod-validated |
| `GET` | `/api/prospects/:id` | Fetch single |
| `PUT` | `/api/prospects/:id` | Partial update |
| `DELETE` | `/api/prospects/:id` | Remove |

### POST body

```json
{
  "name": "Jane Doe",
  "company": "Acme Inc",
  "platform": "YouTube",
  "partnerCategory": "Course Creator",
  "website": "https://acme.com",
  "email": "jane@acme.com",
  "socialUrl": "https://youtube.com/@janedoe",
  "audienceSize": "50k",
  "notes": "Strong productivity niche fit",
  "source": "Manual",
  "status": "New Prospect"
}
```

---

## React Query

| Key | Used in | Mutations |
|---|---|---|
| `['prospects']` | `DiscoveryWorkspace.tsx` | create, update, delete — all invalidate `['prospects']` |
| `['prospects']` | `Dashboard.tsx` | read-only summary |
| `['targets']` | `DiscoveryWorkspace.tsx` | `createTarget` in Add To Targets flow — invalidates `['targets']` |

---

## New Page: `/discovery-workspace`

**Navigation position:** Partner Strategy → **Discovery Workspace** → Targets

### Features

#### Stats Bar
| Stat | Colour |
|---|---|
| Total | neutral |
| Qualified | emerald |
| Added To Targets | purple |
| Rejected | red |

Clicking any stat scrolls to and filters by that status.

#### Filter Bar
- Free-text search (name or company)
- Status dropdown (`"_all_"` sentinel — avoids shadcn SelectItem empty-string constraint)
- Prospect count indicator (`N of M prospects`)

#### Prospect Cards
Each card shows:
- Name, Company
- Status badge (colour-coded with dot)
- Partner Category badge, Platform badge
- Audience Size (with Users icon)
- Source tag (Manual / Quick Capture / CSV Import)
- Email, Website, Social URL links
- Notes (2-line clamp)
- Action strip: Qualify | Reject | Add To Targets | More (Edit, Move to status)
- Delete button (trash icon, top-right)

Status-aware buttons: Qualify and Reject are hidden if already in that state or already Added To Targets.

#### Quick Capture Dialog

User pastes any raw research text. Parser extracts:
- **Email** — regex `[\w.+-]+@[\w.-]+\.[a-z]{2,}`
- **Website** — regex `https?:\/\/[^\s]+`
- **Name** — first non-email, non-URL line
- **Company** — second non-email, non-URL line
- **Notes** — all remaining lines joined

Shows a parsed preview before saving. Warns if no name was extracted. Source is set to `"Quick Capture"`.

#### CSV Import Dialog

Accepts CSV via:
1. File upload (`.csv`)
2. Paste into textarea

**Supported columns** (case-insensitive, spaces/underscores/dashes ignored):
- `Name` (required per row)
- `Company`
- `Email`
- `Website`
- `Platform`
- `Partner Category` / `partner_category`
- `Notes`

Shows a preview table (first 10 rows) before import. Imports row by row with per-row error handling. Source is set to `"CSV Import"`.

Example CSV:
```
Name,Company,Email,Website,Platform,Partner Category,Notes
Jane Doe,Acme Inc,jane@acme.com,https://acme.com,YouTube,Course Creator,Has 50k subscribers
John Smith,Podcast Co,john@podcast.com,https://podcast.com,Podcast,Podcast Host,Interview format
```

#### Add To Targets Dialog

When "Add To Targets" is clicked on a prospect:
1. Shows dialog: select Product + confirm Partner Category
2. Calls `POST /api/targets` (copies name, company, platform, website, email, socialUrl, notes, partnerCategory from the prospect)
3. Calls `PUT /api/prospects/:id` to set status = `"Added To Targets"`
4. Invalidates both `['targets']` and `['prospects']` React Query keys
5. Prospect card moves to "Added To Targets" status, "Add To Targets" button hidden

---

## Dashboard Integration

A **Discovery Workspace** summary card appears once there is at least one prospect. Shows:

| Stat | Logic |
|---|---|
| Prospects | `prospects.length` |
| Qualified | `status = Qualified` |
| Added to Targets | `status = Added To Targets` |
| Rejected | `status = Rejected` |

Clicking any stat navigates to `/discovery-workspace`.

---

## Navigation

New nav item: **Discovery Workspace** (Telescope icon) — positioned between Partner Strategy and Targets.

Full nav order:
1. Dashboard
2. Products
3. Discover Creators
4. Partner Strategy
5. **Discovery Workspace** ← new
6. Targets
7. Outreach
8. Pipeline

---

## Verification Checklist

✅ Discovery Workspace page loads with stats, filters, and empty state  
✅ Add Prospect form — saves to DB, refetches  
✅ Edit Prospect — pre-fills form, updates in place  
✅ Delete Prospect — removes from DB  
✅ Qualify / Reject buttons — status changes persist  
✅ Quick Capture — parses text, creates prospect with source = "Quick Capture"  
✅ CSV Import — file upload and paste both parse; preview table shown; imports all rows  
✅ Add To Targets — creates Target record + marks prospect as "Added To Targets"  
✅ Dashboard summary — appears with prospect data  
✅ Existing Targets page — no regression  
✅ Existing Outreach / Pipeline / Partner Strategy — no regression  
✅ TypeScript: 0 errors (`pnpm run typecheck` across all packages)  
✅ DB migration applied (`pnpm --filter @workspace/db run push`)  

---

## Architecture Notes

- **No empty-string SelectItem values** — all "All" filter options use `"_all_"` sentinel; partner category "none" uses `"_none_"` sentinel (shadcn constraint).
- **Source field** is set deterministically at creation: `"Manual"` | `"Quick Capture"` | `"CSV Import"`. Future API feeds will add their own source strings (e.g. `"Modash"`, `"YouTube Search"`).
- **Add To Targets copies fields** — the prospect record is not deleted, just status-updated. Historical prospect data is preserved.
- **Lib rebuild required** — after adding new exports to `lib/db/src/schema/index.ts`, run `pnpm run typecheck:libs` before checking api-server types. The compiled `.d.ts` files in `lib/db/dist/` must be regenerated first.

---

## Remaining TODOs (Phase 4B candidates)

1. **Prospect → edit dialog pre-select** — add category/platform dropdowns in the manual edit form (currently free-text for platform)
2. **Bulk status change** — checkbox-select multiple prospects → qualify/reject/delete all at once
3. **Prospect deduplication** — warn when a prospect with the same email or name already exists
4. **API feed connectors** — when YouTube / Modash / Creator.co is integrated, push their results here (source = provider name) instead of directly to Targets
5. **Notes history** — append timestamped notes rather than replacing them
6. **Auth integration** — populate `userId` / `organizationId` once Clerk is added
