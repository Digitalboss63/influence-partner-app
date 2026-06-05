# Phase 6B — Campaign Creator Assignment

## Goals met
- Deliverable type + due date tracked per campaign creator (schema + API + UI)
- Eligible-targets API endpoint with fit/contact-readiness scores and assigned-creator exclusion
- Dedicated `GET /campaigns/:id/creators` endpoint
- `DELETE /campaigns/creator/:id` with auto-count sync
- AddCreatorDialog upgraded: searchable eligible-targets picker (shows Fit + CR scores), deliverable type, due date
- BulkAssignDialog upgraded: uses eligible-targets (server-side de-duplication), shows scores
- CreatorRow upgraded: deliverable type badge, due date display, edit deliverable type + date, delete button
- PartnerTargets: "Campaign" button on every target card opens Add to Campaign dialog
- HelpCampaignManagement: sections 8–10 added (assigning, statuses, value tracking)

## Files changed

| File | What / Why |
|---|---|
| `lib/db/src/schema/index.ts` | Added `deliverableTypeEnum`, `deliverableType` + `deliverableDueDate` columns on `campaign_creators`, exported `DeliverableType` type |
| `artifacts/api-server/src/routes/campaigns.ts` | Added `GET /eligible-targets`, `GET /:id/creators`, `DELETE /creator/:id`; updated add-creator + PATCH creator to accept deliverableType + deliverableDueDate |
| `artifacts/influence-partner/src/lib/api-client.ts` | Added `DeliverableType`, `ApiEligibleTarget`, `fetchEligibleTargets`, `deleteCampaignCreator`; updated `ApiCampaignCreator`, `AddCampaignCreatorPayload`, `updateCampaignCreator` payload |
| `artifacts/influence-partner/src/pages/CampaignDetail.tsx` | Rewrote AddCreatorDialog (eligible-targets picker + deliverableType + dueDate); upgraded BulkAssignDialog (uses eligible-targets, shows scores); upgraded CreatorRow (deliverableType badge, dueDate display, delete); cleaned up unused `assignedTargetIds` |
| `artifacts/influence-partner/src/pages/PartnerTargets.tsx` | Added `AddToCampaignDialog`, Campaign button on TargetCard, addToCampaignTarget state |
| `artifacts/influence-partner/src/pages/HelpCampaignManagement.tsx` | Added sections 8 (Assigning), 9 (Statuses), 10 (Value tracking); renumbered limits to 11 |

## Key decisions
- `deliverable_type` enum mirrors the existing `DELIVERABLE_OPTIONS` list (video/short/post/story/review/custom) for UI consistency
- Eligible-targets endpoint excludes already-assigned targetIds server-side; BulkAssign keeps client-side name dedup as safety net
- `GET /campaigns/eligible-targets` and `GET /campaigns/:id/creators` registered before `GET /campaigns/:id` to prevent Express wildcard shadowing
- `deleteCampaignCreator` syncs `assignedCreatorCount` via the same pattern as add-creator and bulk-add
- AddToCampaignDialog creates assignment at "identified" status — user advances through statuses on the campaign detail page

## What's next
- Phase 6C: Campaign analytics / reporting (timeline aggregation, per-campaign ROI chart)
- Phase 7: Full performance dashboard with campaign-level comparisons
