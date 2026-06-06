# Phase 6D — Guided Campaign Launch Wizard

**Base commit:** 188dfc8

## Goals met
- New route `/campaign-launch` with 8-step guided wizard
- 7-phase progress indicator (Product → Discovery → Qualification → Contacts → Targets → Outreach → Campaign) with green/amber/grey status
- Auto-checks before advancing with warning messages for missing data
- Quick action buttons: Run Qualification + Run Contact Intelligence run inline without leaving the wizard
- Campaign creation inline on Step 7 (name, objective, type, budget, target creator count)
- Campaign selection from existing product campaigns
- Launch Campaign (Step 8) — sets campaign to Active + redirects to Campaign Detail
- Help page at `/help/campaign-launch` (8 sections: overview, workflow, progress, required steps, quick actions, launch, troubleshooting, tips)
- Nav item "Campaign Launch" added to sidebar (Rocket icon, after Campaigns)
- Docs created: `docs/PHASE6D_CAMPAIGN_LAUNCH_WIZARD.md`
- TypeScript: 0 errors
- Existing pages unaffected

## Files created
| File | Purpose |
|---|---|
| `artifacts/influence-partner/src/pages/CampaignLaunchWizard.tsx` | 8-step wizard page |
| `artifacts/influence-partner/src/pages/HelpCampaignLaunch.tsx` | Help page |
| `docs/PHASE6D_CAMPAIGN_LAUNCH_WIZARD.md` | Sprint report + docs |

## Files modified
| File | What changed |
|---|---|
| `artifacts/influence-partner/src/App.tsx` | Added routes `/campaign-launch` + `/help/campaign-launch` |
| `artifacts/influence-partner/src/components/Layout.tsx` | Added "Campaign Launch" nav item (Rocket icon) |

## API changes
None — wizard reads from existing endpoints:
- `getProducts()` — product selection
- `getQualificationQueue(productId)` — prospect count (Step 2)
- `getQualificationMetrics(productId)` — qualification status (Step 3)
- `getContactMetrics(productId)` — contact intelligence status (Step 4)
- `getTargets({ productId })` — target count (Step 5)
- `getOutreachOperations({ productId })` — outreach count (Step 6)
- `fetchCampaigns()` — existing campaigns (Step 7)
- `qualifyBatch(productId)` — quick action Step 3
- `discoverContactsBatch(productId)` — quick action Step 4
- `createCampaign(payload)` — inline form Step 7
- `updateCampaign(id, { status: "active" })` — launch Step 8

## UI routes
- `/campaign-launch` — Campaign Launch Wizard
- `/help/campaign-launch` — Help page

## Verification
- TypeScript: 0 errors
- Existing pages: unaffected
- Wizard loads: ✓
- Progress indicator: ✓ (green/amber/grey per step)
- Validation: ✓ (product required; campaign required for launch)
- Launch creates/opens campaign: ✓
- Inline qualification run: ✓
- Inline contact intel run: ✓
- No regressions: ✓

## Remaining limitations
- Discovery (Step 2) and Research Letters (Step 6) open external pages — they cannot run inline since they require user configuration per creator
- The wizard does not pre-select the product from localStorage (`ip_selected_product`) — it uses its own local state for clarity
- "Back from external page" relies on browser back button; the wizard does not detect when you've returned after completing an action on another page
- Batch operations (qualify, contact intel) apply to ALL prospects for the product — per-creator control requires using the full Qualification/Contact Intelligence pages

## What's next
- Phase 7: Executive reporting — campaign-level ROI comparisons, exclusivity pipeline summary
