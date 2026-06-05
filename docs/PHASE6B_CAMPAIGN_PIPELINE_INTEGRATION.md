# Phase 6B — Campaign Pipeline Integration & Bulk Assignment

## Summary

Phase 6B extends the Campaign Management system with bulk creator assignment, a campaign activity timeline, stable ID-based outreach matching, and campaign badges in the Outreach Operations page.

---

## Files Changed

### Schema
- `lib/db/src/schema/index.ts` — Added `campaignId` (nullable FK → `campaigns.id`, `ON DELETE SET NULL`) to `outreachOperationsTable`. This is a forward reference resolved by Drizzle's thunk pattern.

### API Server
- `artifacts/api-server/src/routes/campaigns.ts`
  - Added `POST /api/campaigns/:id/bulk-add-creators`
  - Added `GET /api/campaigns/:id/timeline`
  - Updated `GET /api/campaigns/:id` — outreach rollup now prefers `targetId` matching (stable IDs) over name matching (fragile), with name as fallback. Returns per-creator `outreachCount`.
- `artifacts/api-server/src/routes/outreach-operations.ts`
  - `GET /api/outreach-operations` now enriches each row with `campaignName` (left-join via `campaignsTable`).

### Frontend
- `artifacts/influence-partner/src/lib/api-client.ts`
  - `ApiOutreachOperation` — added `campaignId: string | null`, `campaignName: string | null`
  - `ApiCampaignCreator` — added `outreachCount: number`
  - Added `BulkAddCreatorItem`, `BulkAddResult` types
  - Added `bulkAddCampaignCreators()` function
  - Added `ApiCampaignTimelineEvent` type
  - Added `fetchCampaignTimeline()` function
- `artifacts/influence-partner/src/pages/CampaignDetail.tsx`
  - Added `BulkAssignDialog` component — checkbox list of targets not yet in campaign, deduplicates by targetId then name, returns added/skipped counts
  - Added `TimelineSection` component — chronological events (campaign created, creator assigned, outreach sent/replied, status changes)
  - Added `outreachCount` badge on creator rows
  - Added `🔗` indicator on creator rows when linked to a target record
  - Improved empty state with dual CTA (bulk vs manual)
  - Added loading spinner on page load
- `artifacts/influence-partner/src/pages/OutreachOperations.tsx`
  - Added Megaphone campaign badge on cards where `campaignId` is set

---

## Routes Added / Modified

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/campaigns/:id/bulk-add-creators` | Bulk add creators by targetId; de-duplicates and returns `{added, skipped, errors}` |
| GET  | `/api/campaigns/:id/timeline` | Returns sorted timeline events for a campaign |
| GET  | `/api/campaigns/:id` | Updated: stable outreach rollup + per-creator outreach count |
| GET  | `/api/outreach-operations` | Updated: enriched with `campaignName` |

---

## Schema Changes

```sql
ALTER TABLE outreach_operations
  ADD COLUMN campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
```

Applied via `pnpm --filter @workspace/db run push`.

---

## ID Matching Strategy

| Situation | Matching method |
|-----------|----------------|
| `campaign_creator.targetId` is set | Match `outreach_operations.targetId` (stable, preferred) |
| `campaign_creator.targetId` is null | Match `outreach_operations.creatorName` (fragile, fallback) |

**Known limitation:** Name matching is case-sensitive at the DB level for the `inArray` filter. Creators added by name only (no target link) will miss outreach ops if the name is spelled differently. Recommendation: always link to a target record when assigning a creator.

---

## Testing Performed

- Bulk assign: selected 3 targets → 3 added, re-run → 3 skipped
- Duplicate prevention: adding same target twice → correct skip count
- Timeline: appeared immediately after creator assignment; outreach events appear after outreach ops exist
- Per-creator outreach count: shows on creator rows
- Campaign badge in Outreach Operations: visible when `campaignId` set
- All existing routes unaffected (typecheck 0 errors)

---

## Known Limitations

- `outreach_operations.campaignId` is not set automatically when creating outreach ops. A future phase should let users select a campaign from the Outreach Operations create dialog.
- Timeline does not yet include revenue/performance events (no timestamp granularity in creator_performance).
- CRM Pipeline (creator-based) is separate from campaign assignments (target-based) — no direct join exists between the two systems because pipeline uses `creatorId` (from `creators` table) while campaigns use `targetId` (from `partner_targets`).

---

## Next Recommended Phase

**Phase 6C — Campaign↔Outreach Integration**
- Add `campaignId` field to the Create/Edit Outreach Operation dialog so new outreach ops can be linked to campaigns at creation time.
- Auto-suggest campaign based on selected target's campaign assignment.
- Show per-campaign outreach breakdown in Campaign Detail using the stable `campaignId` field.
