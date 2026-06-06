# Phase 6C — Exclusivity Policy

**Sprint name:** Exclusivity Management Policy

## Goals met
- Platform-wide exclusivity policy implemented across schema, API, UI, help, and documentation
- New `exclusivity_type` enum (none/soft/full) and `exclusivity_status` enum (not_eligible/eligible_for_review/under_review/approved/declined/expired) added to DB
- All new creators default to `exclusivity_type = none`, `exclusivity_status = not_eligible`
- No automatic eligibility — always manually reviewed by team
- Exclusivity fields surfaced in CampaignDetail creator row edit form with badge display
- Help page updated with "Understanding Exclusivity" section (section 12)
- Policy document created: `docs/EXCLUSIVITY_POLICY.md`
- TypeScript: 0 errors
- Existing campaign workflows unaffected

## Files modified

| File | What / Why |
|---|---|
| `lib/db/src/schema/index.ts` | Added `exclusivityTypeEnum` + `exclusivityStatusEnum` pgEnums; added 5 columns to `campaign_creators` (`exclusivity_type`, `exclusivity_status`, `exclusivity_start_date`, `exclusivity_end_date`, `exclusivity_notes`); exported `ExclusivityType` + `ExclusivityStatus` types |
| `artifacts/api-server/src/routes/campaigns.ts` | Imported `ExclusivityType`/`ExclusivityStatus`; added 5 exclusivity fields to PATCH `/campaigns/creator/:id` handler |
| `artifacts/influence-partner/src/lib/api-client.ts` | Added `ExclusivityType` + `ExclusivityStatus` type unions; added exclusivity fields to `ApiCampaignCreator` interface and `updateCampaignCreator` payload |
| `artifacts/influence-partner/src/pages/CampaignDetail.tsx` | Added `EXCLUSIVITY_TYPE/STATUS_OPTIONS/LABELS/COLORS` constants; added exclusivity state vars to `CreatorRow`; added exclusivity badge display (shown when type ≠ none); added Exclusivity edit section to inline edit form; reset exclusivity state on cancel |
| `artifacts/influence-partner/src/pages/HelpCampaignManagement.tsx` | Added section 12 "Understanding Exclusivity" with policy language, type definitions, and status definitions |

## DB changes

- 2 new PostgreSQL enums: `exclusivity_type`, `exclusivity_status`
- 5 new nullable/defaulted columns on `campaign_creators`:
  - `exclusivity_type exclusivity_type NOT NULL DEFAULT 'none'`
  - `exclusivity_status exclusivity_status NOT NULL DEFAULT 'not_eligible'`
  - `exclusivity_start_date timestamp`
  - `exclusivity_end_date timestamp`
  - `exclusivity_notes text`

## Documentation created

- `docs/EXCLUSIVITY_POLICY.md` — full policy covering purpose, eligibility, review/approval/renewal/expiration processes, type/status definitions, future compatibility notes

## Key decisions
- Defaults (none / not_eligible) enforce the policy mechanically — system can never accidentally grant exclusivity
- Thresholds not hard-coded: eligibility criteria are documented in policy but configurable for future settings module
- `ExclusivityStatus.declined` is distinct from `AssignmentStatus.declined` — both exist independently per creator
- Schema and docs explicitly note future hooks for exclusive campaigns, territories, categories, and portal display — no redesign needed

## What's next
- Phase 7: Executive reporting — campaign-level ROI comparisons, exclusivity pipeline summary
- Future: Settings module for configurable eligibility thresholds
- Future: Exclusive campaign flag on `campaignsTable` (schema already compatible)
