# Sprint Change Report — Phase 6A: Campaign Management

## Sprint Name
Phase 6A — Campaign Management

## Goals Met
- Added `campaign_type` enum column to the `campaigns` DB table (additive migration)
- Extended API POST/PATCH routes to accept and persist `campaignType`
- Extended frontend types (`CampaignType` union, `ApiCampaign.campaignType`, `CreateCampaignPayload.campaignType`)
- Create Campaign dialog now includes a Campaign Type selector (awareness / affiliate / sponsorship / launch / review / custom)
- Campaign cards display a type badge for all non-`custom` types
- Campaign Detail shows the type inline under objective
- TypeScript 0 errors across all workspace packages
- Phase 6A doc written at `docs/PHASE6A_CAMPAIGN_MANAGEMENT.md`

## Files Changed

| File | What & Why |
|------|-----------|
| `lib/db/src/schema/index.ts` | Added `campaignTypeEnum` PG enum + `campaignType` column (default `custom`) to `campaignsTable`; exported `CampaignType` type |
| `artifacts/api-server/src/routes/campaigns.ts` | Imported `CampaignType`; POST handler writes `campaignType` on create; PATCH handler patches `campaignType` on update |
| `artifacts/influence-partner/src/lib/api-client.ts` | Added `CampaignType` union type; added `campaignType` to `ApiCampaign` interface and `CreateCampaignPayload` |
| `artifacts/influence-partner/src/pages/Campaigns.tsx` | Form state + reset include `campaignType`; Create dialog has Campaign Type `<Select>`; mutation passes `campaignType`; campaign cards show type badge |
| `artifacts/influence-partner/src/pages/CampaignDetail.tsx` | Shows "Type: <value>" beneath objective |
| `docs/PHASE6A_CAMPAIGN_MANAGEMENT.md` | Full Phase 6A feature reference doc |

## Key Decisions

- **Additive migration only**: `campaign_type` added as a nullable column with default `custom` so existing campaigns get a sensible fallback and no data is lost.
- **`custom` badge suppressed on cards**: Only non-`custom` types display a badge — reduces visual noise on the most common default value.
- **Enum defined in DB + TypeScript**: `campaignTypeEnum` in Drizzle schema is the canonical source; a matching union in `api-client.ts` keeps the frontend type-safe without a full codegen cycle.

## What's Next

- Phase 6B: Campaign creator assignment UI (drag creators from Discovery into a campaign)
- Phase 6C: Campaign performance metrics / dashboard widget
- Phase 7: YouTube Discovery enrichment + scoring refinements
