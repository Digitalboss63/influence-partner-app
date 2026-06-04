# Phase 3B — Partner Outreach Intelligence

## Goal
Connect the Partner Strategy page to the Outreach flow and Pipeline, giving users a complete acquisition workflow: **discover → plan → outreach → track**.

## New Pages

### `/partner-outreach` — Partner Outreach Plan
A dedicated page for generating and managing a 5-message outreach sequence for a specific partner type × product combination.

**URL params:**
- `partnerType` — e.g. `Course Creator`
- `commission` — e.g. `40%`
- `outreachAngle` — the outreach angle text from `partnerIntelligence.ts`
- `tier` — `1`, `2`, or `3`
- `icon` — emoji icon for the partner type

**Page sections:**
1. **Context bar** — product name, category, price, commission, target customer, main benefit
2. **Why this partner was selected** — deterministic explanation based on partner type family
3. **Outreach plan details** — offer angle, follow-up timing, call to action
4. **5 message tabs** — First Email | Short DM | Follow-up 1 | Follow-up 2 | Handle Objections
5. **Save Outreach Plan** button → localStorage
6. **Add to Pipeline** button → localStorage partner pipeline targets
7. **CTA footer** → Back to Partner Strategy | Browse Creators

## New Library Files

### `src/lib/partnerOutreach.ts`
Deterministic outreach message engine.

**Key export:** `generatePartnerOutreachMessages(partnerType, product, commission, outreachAngle)`

**Partner type families (detection via keyword matching):**
| Family | Keyword signals |
|---|---|
| `educator` | course, educator, teacher, training |
| `podcaster` | podcast, show host |
| `newsletter` | newsletter, email list, substack |
| `community` | community, group, tribe, member |
| `financial` | financial, mortgage, credit, accounting, budget, wealth, money, finance |
| `reviewer` | youtube, reviewer, review, channel, streamer |
| `fitness` | fitness, trainer, nutrition, gym, health, wellness, supplement |
| `lifestyle` | lifestyle, vlogger, influencer, blogger |
| `default` | fallback for any unmatched type |

**5 message types per plan:**
1. **First Email** — Subject line + full email with personalised intro, why selected, commission offer, CTA
2. **Short DM** — Under 150 words, punchy, includes commission, designed for social DMs
3. **Follow-up 1** — Day 4–5: adds social proof tailored to partner family
4. **Follow-up 2** — Day 9–10: short, friendly, easy to respond to, no pressure
5. **Objection Response** — Handles "I don't do affiliate deals", "not the right fit", "too busy right now"

All messages include `[First Name]` and `[Your Name]` placeholders. Users can edit in the text area before copying.

### `src/lib/savedPlans.ts`
localStorage persistence layer for the outreach workflow.

**Types:**
```ts
interface SavedOutreachPlan {
  id: string;
  partnerType: string;
  productId: string;
  productName: string;
  commission: string;
  outreachAngle: string;
  tier: number;
  savedAt: string; // ISO date
  icon?: string;
}

interface PartnerPipelineTarget {
  id: string;
  partnerType: string;
  productId: string;
  productName: string;
  commission: string;
  stage: "Targeting" | "Outreach Sent" | "Following Up" | "In Conversation" | "Active";
  addedAt: string;
  icon?: string;
}
```

**localStorage keys:**
- `ip_saved_outreach_plans` — array of `SavedOutreachPlan`
- `ip_partner_pipeline_targets` — array of `PartnerPipelineTarget`

**Functions:**
- `getSavedPlans()` — read all saved plans
- `saveOutreachPlan(plan)` — upserts by partnerType+productId
- `deleteSavedPlan(id)` — removes by id
- `getPartnerPipelineTargets()` — read all pipeline targets
- `addPartnerPipelineTarget(target)` — adds if not already exists, returns `{ added, isNew }`
- `updatePartnerTargetStage(id, stage)` — update stage
- `deletePartnerPipelineTarget(id)` — remove by id

## Edited Pages

### `src/pages/PartnerStrategy.tsx`
- `PartnerCategoryCard` now accepts `onCreatePlan: () => void` prop
- Each card has a "Create Outreach Plan" button at the bottom
- Clicking navigates to `/partner-outreach?partnerType=...&commission=...&outreachAngle=...&tier=...&icon=...`
- Info banner updated to mention the "Create Outreach Plan" button

### `src/pages/Dashboard.tsx`
- Added "Ready To Contact" section — appears when any outreach plans are saved
- Reads from `getSavedPlans()` on mount via `useEffect`
- Shows a card grid: partner type, icon, product, tier, commission, save date
- Each card has "Open 5 Messages" button (navigates back to `/partner-outreach` with correct params)
- Each card has a delete button (calls `deleteSavedPlan()` and re-reads state)
- Section appears between Campaign Workflow and Partner Discovery Intelligence

### `src/App.tsx`
- Added import for `PartnerOutreachPlan`
- Added `<Route path="/partner-outreach" component={PartnerOutreachPlan} />`

## Persistence Strategy

**Why localStorage (not the DB API):**
The existing `outreachMessagesTable` has `creatorId NOT NULL` with a FK constraint to `creatorsTable`. Partner-type outreach plans don't have a real creator ID — they represent a category of partner, not an individual. Storing them in the DB would require either:
1. A nullable `creatorId` column + migration
2. A new `partner_outreach_plans` table + migration

Both are safe future paths. For Phase 3B, localStorage is the correct choice — it's instant, zero-risk, and allows the full UX to be delivered without a DB migration. The persistence status is surfaced clearly in the change report.

**Future migration path:**
When real partner discovery integrations are built (Phase 4), we will:
1. Create a `partner_outreach_plans` table with `partner_type text`, `product_id uuid`, and the 5 message fields
2. Add a `POST /api/partner-outreach-plans` endpoint
3. Migrate `savedPlans.ts` to use the API with localStorage as an offline fallback

## UX Decisions

- **"Grandma Easy" messaging**: All buttons use plain language ("Open 5 Messages", "Save Outreach Plan", "Add to Pipeline"), not technical terms
- **Editable messages**: All 5 messages are in editable textareas so users can personalise before copying
- **Previous/Next navigation**: Tab strip + arrow buttons so users can step through the sequence linearly
- **Per-tab copy button**: Both at the top-right of the card and at the bottom, so the user never has to scroll
- **Save is idempotent**: Saving the same partnerType+productId combo overwrites the existing record, not creates a duplicate
- **"Add to Pipeline" is idempotent**: If already tracked, returns `isNew: false` and shows an "Already in pipeline" toast

## Files Changed Summary

| File | Status |
|---|---|
| `src/lib/partnerOutreach.ts` | New |
| `src/lib/savedPlans.ts` | New |
| `src/pages/PartnerOutreachPlan.tsx` | New |
| `src/pages/PartnerStrategy.tsx` | Edited |
| `src/App.tsx` | Edited |
| `src/pages/Dashboard.tsx` | Edited |
| `docs/PHASE3B_PARTNER_OUTREACH_INTELLIGENCE.md` | New |

## What's Next (Phase 3C candidates)

1. **DB persistence for outreach plans** — migrate `ip_saved_outreach_plans` to a proper API endpoint and `partner_outreach_plans` table
2. **CRM Pipeline partner targets section** — show `ip_partner_pipeline_targets` as a dedicated column in the Kanban board
3. **Outreach plan analytics** — track which partner types have plans saved vs contacted vs active
4. **Template personalisation** — let users edit the base message templates once, saving them to localStorage
5. **Email service integration** — "Send via Resend/Mailgun" button on the First Email tab
