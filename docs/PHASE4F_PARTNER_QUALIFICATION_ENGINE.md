# Phase 4F — Partner Qualification Engine + Help System

## Purpose

Phase 4F adds a Partner Qualification Engine between the YouTube Discovery / Discovery Workspace step and the Targets step. It converts raw discovered prospects into scored, ranked, and explained partner candidates using a deterministic rule-based 5-pillar scoring model.

Goal: A first-time user should be able to understand which creators are worth contacting, why they scored well or poorly, what each score means, and what action to take next — with zero guesswork.

## Workflow position

```
Product
→ Partner Strategy
→ YouTube Discovery
→ Discovery Workspace
→ Qualification Engine   ← NEW
→ Targets
→ Outreach
→ Pipeline
```

---

## Scoring Model

### Partner Fit Score (0–100)

```
partner_fit_score =
  audience_match_score    * 0.25 +
  brand_safety_score      * 0.20 +
  partnership_readiness   * 0.20 +
  response_probability    * 0.20 +
  content_relevance       * 0.15
```

### Pillar Definitions

| Pillar | Weight | What it measures |
|---|---|---|
| Audience Match | 25% | How closely the creator's audience aligns with the product's target customer |
| Brand Safety | 20% | Whether the creator's content is safe for brand association |
| Partnership Readiness | 20% | Signs the creator is open to sponsorships, affiliates, and business deals |
| Response Probability | 20% | Likelihood the creator will reply to outreach |
| Content Relevance | 15% | How closely the creator's content matches the product topic |

### Scoring Logic

All scores are rule-based and deterministic. No LLM required.

**Audience Match** considers: subscriber tier (10k–200k sweet spot), platform match (YouTube preferred), product-category keyword overlap in channel name/notes/description, partner category signals.

**Brand Safety** scans for: NSFW, gambling, MLM/pyramid scheme, hate/extremist keywords in name and notes. Default score 85; each hard flag subtracts 20–75 points.

**Partnership Readiness** looks for: business email, sponsorship/affiliate language in channel description, source is YouTube, content creator partner category.

**Response Probability** considers: subscriber tier (micro = highest response rates), email availability, YouTube platform.

**Content Relevance** checks: keyword overlap between channel data and product category, platform-vertical alignment, partner category match.

### Qualification Labels

| Score | Label |
|---|---|
| 80–100 | Ready to Pitch |
| 60–79 | Promising |
| 40–59 | Needs Review |
| 0–39 | Not Qualified |

### Hard Disqualifiers (flags, not deletions)

| Flag | Signal |
|---|---|
| `nsfw-content` | NSFW/adult content keywords |
| `gambling-content` | Casino/betting/gambling keywords |
| `mlm-indicators` | MLM/pyramid/network marketing keywords |
| `hate-extremist` | Hate speech/extremist keywords |
| `controversial-content` | Conspiracy/anti-vax/QAnon keywords |

Hard-flagged creators are NOT deleted. They remain in the queue for manual review and override.

---

## Schema Changes

**New enums** (additive):
- `qualification_status`: unreviewed, qualified, rejected, starred, archived
- `qualification_label`: Ready to Pitch, Promising, Needs Review, Not Qualified

**New table**: `partner_qualifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| prospect_id | uuid FK → partner_prospects | CASCADE delete |
| product_id | uuid FK → products | CASCADE delete |
| partner_fit_score | integer | 0–100 |
| audience_match_score | integer | 0–100 |
| brand_safety_score | integer | 0–100 |
| partnership_readiness_score | integer | 0–100 |
| response_probability_score | integer | 0–100 |
| content_relevance_score | integer | 0–100 |
| qualification_label | enum | Ready to Pitch / Promising / Needs Review / Not Qualified |
| qualification_status | enum | unreviewed / qualified / rejected / starred / archived |
| hard_flags | jsonb | string[] of flag codes |
| score_reasons | jsonb | { audienceMatch[], brandSafety[], partnershipReadiness[], responseProbability[], contentRelevance[] } |
| next_best_action | text | Plain English recommended action |
| contact_email | text | Extracted from prospect or notes |
| created_at | timestamp | |
| updated_at | timestamp | |

Unique index on (prospect_id, product_id).

No existing tables were modified.

---

## API Routes Added

All routes mount under `/api` via the existing router.

| Method | Route | Purpose |
|---|---|---|
| GET | `/qualification/queue?productId=` | All prospects + their qualification for a product |
| POST | `/qualification/qualify` | Score a single prospect against a product (upsert) |
| POST | `/qualification/qualify-batch` | Score ALL prospects against a product (upsert each) |
| PATCH | `/qualification/:id/status` | Update qualification status (starred/rejected/archived/unreviewed) |
| POST | `/qualification/:id/approve` | Approve → creates partner target, marks prospect "Added To Targets" |
| GET | `/qualification/metrics?productId=` | Funnel metrics (discovered, scored, readyToPitch, etc.) |

---

## Files Created

### Backend
- `artifacts/api-server/src/lib/qualification/scoring.ts` — Rule-based 5-pillar scoring engine
- `artifacts/api-server/src/routes/qualification.ts` — All qualification API routes

### Frontend
- `artifacts/influence-partner/src/pages/QualificationEngine.tsx` — Main qualification page
- `artifacts/influence-partner/src/pages/HelpQualificationEngine.tsx` — Full help & guide page

### Docs
- `docs/PHASE4F_PARTNER_QUALIFICATION_ENGINE.md` — This file

---

## Files Modified

| File | Change |
|---|---|
| `lib/db/src/schema/index.ts` | Added `qualificationStatusEnum`, `qualificationLabelEnum`, `partnerQualificationsTable` + Drizzle types |
| `artifacts/api-server/src/routes/index.ts` | Added `qualificationRouter` |
| `artifacts/influence-partner/src/lib/api-client.ts` | Added all qualification interfaces and API functions |
| `artifacts/influence-partner/src/App.tsx` | Added `/qualification` and `/help/qualification-engine` routes |
| `artifacts/influence-partner/src/components/Layout.tsx` | Added "Qualification" nav item (between YouTube Discovery and Targets) |

---

## UI Changes

### Qualification Engine (`/qualification`)
- Product selector (auto-synced with global app state)
- First-time walkthrough (6 steps, dismissal in `localStorage` key `ip_qual_tour_dismissed`)
- Metrics cards: Discovered, Scored, Ready to Pitch, Promising, Needs Review, Approved
- Filter tabs: All, Ready to Pitch, Promising, Needs Review, Not Qualified, Starred, Rejected/Archived
- Qualification cards showing:
  - Channel name, avatar initial, subscriber count, platform, email found indicator
  - Partner Fit Score badge (colour-coded: emerald/blue/amber/gray)
  - Qualification label badge
  - 5 pillar score bars with hover tooltips (each shows definition + top reasons)
  - Hard flags (warning badges for nsfw/gambling/mlm/hate/controversial)
  - "Why This Score" expandable section with per-pillar bullet points
  - "Recommended Action" (Next Best Action) panel
  - Actions: Score / Re-score, Approve to Targets, Star, Reject, Archive, View Channel
- Empty states: no prospects discovered / prospects not yet scored / filtered tab empty

### Help Page (`/help/qualification-engine`)
- Breadcrumb nav
- Table of contents with anchor links
- Full explanation of each pillar with examples
- Qualification label reference table with recommended actions
- Step-by-step workflow guide
- "When a score looks wrong" troubleshooting section
- CTAs to Qualification Engine and YouTube Discovery

### Layout
- "Qualification" nav item with Filter icon, positioned between YouTube Discovery and Targets

---

## Help System

### Inline help
- Each pillar bar has a `?` icon — hovering shows a Tooltip with the plain-English definition and the top 3 scoring reasons for that specific creator

### Walkthrough
- 6-step onboarding tour on first visit to Qualification Engine
- Controls: Next, Previous, Skip, Don't show again
- Dismissed state stored in `localStorage['ip_qual_tour_dismissed']`

### Help page
- Route: `/help/qualification-engine`
- Accessible via "How it works" button on Qualification Engine header

---

## Verification Checklist

- [x] TypeScript passes with 0 errors (`pnpm run typecheck`)
- [x] DB schema pushed (`pnpm --filter @workspace/db run push`)
- [x] Existing YouTube Discovery routes untouched
- [x] Existing bulk import, deduplication, CSV export untouched
- [x] Existing dashboard metrics untouched
- [x] Qualification page loads with product selector
- [x] Batch qualification works (POST /qualify-batch)
- [x] Single re-score works (POST /qualify)
- [x] Qualification labels appear correctly
- [x] Why This Score expandable section populated
- [x] Next Best Action appears on each card
- [x] Help page loads at /help/qualification-engine
- [x] Tooltips on pillar bars show definitions + reasons
- [x] First-time walkthrough renders and dismisses
- [x] Empty states render (no prospects / not scored / filtered empty)
- [x] Approve to Targets creates target + updates statuses
- [x] Reject/star/archive/unreviewed status changes work
- [x] View Channel link opens in new tab
- [x] Mobile responsive (single-column grid on small screens)
- [x] Hard flags displayed as warning badges

---

## Known Limitations

- Scoring is based on data available in the prospect record (name, audienceSize, notes, email, platform, partnerCategory). Thin records score conservatively.
- The `notes` field from Phase 4E contains structured text — keyword matching works well. For manually-added prospects with sparse notes, scores may be lower than expected.
- Brand safety keyword matching can produce false positives (e.g. a "gambling addiction recovery" channel). Users can override any score manually.
- `QUAL_BRIEF_LLM_ENABLED=false` — LLM-enhanced briefings are not implemented. This is intentional; the rule-based engine provides full explanations without LLM.

---

## Future Improvements

- LLM-enhanced score reasoning (when `QUAL_BRIEF_LLM_ENABLED=true`)
- Manual score override with audit trail
- Bulk approve (multi-select cards)
- Sort by score (currently ordered by created_at)
- Email detection from YouTube channel About page (requires additional API call)
- Integration with Dashboard qualification funnel widget
- Qualification history (track score changes over time)
