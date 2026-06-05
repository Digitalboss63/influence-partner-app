# Phase 4E — YouTube Discovery Quality Pass

## Overview

Four targeted quality improvements to the YouTube Discovery page:

1. **Better product-based keyword suggestions** — uses Product Intelligence engine for niche-specific terms
2. **Score filter chips** — instant client-side filtering by Excellent / Good / Moderate / Low
3. **Notes pre-fill** — every added prospect receives structured insights in their notes field
4. **Latest video preview** — each result card shows the channel's most recent video title and age
5. **Export to CSV** — download all visible results with insights included

---

## 1. Better Product-Based Keyword Suggestions

### What changed

The `buildProductKeywords()` function now calls `generateProductIntelligence(product)` — the same deterministic engine used by the Product Intake page — to derive richer, niche-specific YouTube search terms.

### Keyword sources (priority order)

| Source | Example output | Why useful |
|---|---|---|
| `subNiches` (from `subMarket`) | "Investment Tracking", "Budgeting" | Direct topical search terms |
| `buyerPersona.interests` | "Investing", "FIRE movement" | Audience intent keywords |
| Primary `recommendedCreatorCategories` | "Personal Finance", "Investing" | Content category match |
| `mainNiche` | "Productivity & Workflow" | Broad niche anchor |
| Product `name`, `category` | "CreditEdge Pro", "Finance" | Fallback anchors |

Chips are deduplicated case-insensitively and capped at 8. Short phrases only (3–55 characters).

### Examples

| Product | Category | Chip output |
|---|---|---|
| Credit Signal Pro | Finance | Investment Tracking · Budgeting · Wealth Management · Investing · FIRE movement · Personal Finance · Investing |
| Vital Herbs | Health | Mental Health · Sleep · Longevity · Biohacking · Mindfulness · Health & Wellness · Mindfulness / Meditation |
| TaskFlow AI | Productivity | Remote Work Tools · Task Automation · Time Tracking · Remote work · Notion/Obsidian · Productivity / Workflow |

### Why not the previous approach

Phase 4D used raw product fields (`name`, `category`, `targetCustomer`, `mainBenefit`). These are good fallbacks but miss niche vocabulary — a health product would only chip "Health", "Reduce stress" etc., not the richer terms buyers actually search on YouTube.

---

## 2. Score Filter Chips

### What it does

A row of filter chips appears above the results grid when search results are shown:

```
Filter: [All (15)]  [Excellent (3)]  [Good (7)]  [Moderate (4)]  [Low (1)]
```

- Chips only show labels that have ≥1 result
- Clicking a chip filters the visible cards to that label only
- Clicking the active chip (or "All") clears the filter
- Filter resets to "All" on every new search
- The Export button always exports the currently-filtered set: "Export (7)" vs "Export"
- Bulk selection (checkboxes, Select all) operates on the filtered set

### State

```typescript
const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
type ScoreFilter = "all" | "Excellent" | "Good" | "Moderate" | "Low";

const filteredChannels = useMemo(
  () => scoreFilter === "all" ? channels : channels.filter(ch => ch.discoveryLabel === scoreFilter),
  [channels, scoreFilter]
);
```

### Count badges

`scoreCounts` is a `useMemo` mapping each label to its occurrence count in the full (unfiltered) results, so the counts in the chips always reflect total search results, not filtered.

---

## 3. Notes Pre-Fill

### What it does

Every channel added to the Discovery Workspace — whether individually or via bulk add — now receives a structured notes block in the prospect record:

```
Match Reason: #2 search result · 50k subscribers · discovery score 78/100
Why This Fits: Sweet spot for 35–40% commission deals — enough reach for real revenue without mega-creator rates
Suggested Outreach Angle: Lead with a revenue projection: show estimated monthly earnings at 35–40% commission

About: [first 300 characters of channel description]
```

### Implementation

```typescript
function buildProspectNotes(ch: YouTubeChannel, insights: ChannelInsights): string {
  const lines = [
    `Match Reason: ${insights.matchReason}`,
    `Why This Fits: ${insights.whyItFits}`,
    `Suggested Outreach Angle: ${insights.outreachAngle}`,
  ];
  if (ch.description) lines.push("", `About: ${ch.description.slice(0, 300)}`);
  return lines.join("\n").slice(0, 1000); // DB notes column cap
}
```

This note is passed as `notes` to `createProspect` in both the single-add flow (`handleAdd`) and bulk-add loop (`handleBulkAdd`).

### UX feedback

A footnote in the expanded insights panel reads:
> "This analysis is saved to the prospect notes in Discovery Workspace"

This makes the connection between the UI analysis and the persisted data explicit.

---

## 4. Latest Video Preview

### Quota analysis

| API call | Quota units | Notes |
|---|---|---|
| `search.list` | 100 | Already in Phase 4C |
| `channels.list` (statistics + snippet + contentDetails) | 1 | Adding `contentDetails` part is free with existing call |
| `playlistItems.list` × N channels | 1 per channel | New — N is typically 10–20 |
| **Total per search** | **~115–125** | vs ~101 before (14–24% increase) |

Daily quota: YouTube default is 10,000 units/day.
- Before Phase 4E: ~99 searches/day
- After Phase 4E: ~85 searches/day
- **Decision: IMPLEMENT** — the video context adds significant partner-vetting value for a modest quota increase.

### Implementation

**Server (`youtube.ts`):**

1. `channels.list` `part` extended: `"statistics,snippet,contentDetails"`
2. `contentDetails.relatedPlaylists.uploads` gives the channel's uploads playlist ID (format: `UU{channelId}`)
3. `Promise.allSettled` fires all `playlistItems.list` calls in parallel with `maxResults=1&part=snippet`
4. Per-channel failures are swallowed silently — the whole search never fails because one channel's playlist errored
5. Results merged as `latestVideoTitle: string | null` and `latestVideoPublishedAt: string | null` on each `YoutubeChannel`

**Frontend (`YoutubeDiscovery.tsx`):**

```tsx
{ch.latestVideoTitle && (
  <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1.5">
    <Film className="w-3 h-3 flex-shrink-0 mt-0.5" />
    <span className="truncate">
      <span className="font-medium text-foreground">Latest: </span>
      {ch.latestVideoTitle}
      {ch.latestVideoPublishedAt && (
        <span className="ml-1 text-muted-foreground/70">
          · {formatVideoAge(ch.latestVideoPublishedAt)}
        </span>
      )}
    </span>
  </div>
)}
```

`formatVideoAge()` converts the ISO timestamp to a human label:
- Same day → "today"
- 1 day → "yesterday"
- < 14 days → "Xd ago"
- < 60 days → "Xw ago"
- < 365 days → "Xmo ago"
- Older → "Xy ago"

A channel with an old latest video (e.g., "2y ago") is a meaningful quality signal — the creator may be inactive.

**Type changes:**

Both `YoutubeChannel` in `api-client.ts` and `YoutubeChannel` in `api-server/routes/youtube.ts` gained:
```typescript
latestVideoTitle: string | null;
latestVideoPublishedAt: string | null;
```

---

## 5. Export to CSV

### What it does

An "Export" button appears in the results header bar (right side, next to "Add Selected"). When a score filter is active, the label shows the count: **"Export (7)"**.

Clicking exports a UTF-8 CSV file with a BOM (for correct Excel rendering) named:
```
yt-discovery-{keyword-slug}-{YYYY-MM-DD}.csv
```

### Columns

| Column | Source |
|---|---|
| Channel Name | `ch.channelName` |
| URL | `ch.channelUrl` |
| Subscribers | `ch.subscriberCount` |
| Discovery Score | `ch.discoveryScore` |
| Score Label | `ch.discoveryLabel` |
| Description | `ch.description` |
| Suggested Outreach Angle | `computeInsights(ch).outreachAngle` |
| Latest Video Title | `ch.latestVideoTitle` |
| Latest Video Date | `ch.latestVideoPublishedAt` (formatted as `toLocaleDateString`) |

### Implementation

Pure client-side: no server call, no quota cost. Uses `URL.createObjectURL(Blob)` + a temporary `<a>` element for the download trigger. BOM prefix (`\uFEFF`) ensures Excel reads UTF-8 correctly.

---

## Files Changed

| File | Status | Changes |
|---|---|---|
| `artifacts/api-server/src/routes/youtube.ts` | Edited | Added `YtPlaylistItem` type; added `contentDetails` to `YtChannelItem`; extended `channels.list` part to include `contentDetails`; added parallel `playlistItems.list` fetch with `Promise.allSettled`; added `latestVideoTitle`/`latestVideoPublishedAt` to `YoutubeChannel` type and response |
| `artifacts/influence-partner/src/lib/api-client.ts` | Edited | Added `latestVideoTitle: string \| null` and `latestVideoPublishedAt: string \| null` to `YouTubeChannel` interface |
| `artifacts/influence-partner/src/pages/YoutubeDiscovery.tsx` | Rewritten | Better keywords via `generateProductIntelligence`; score filter chips + state; `buildProspectNotes()` pre-fill; `exportToCSV()`; latest video row on each card; `formatVideoAge()` helper; `Film`, `Download`, `Filter` icons |
| `docs/PHASE4E_YOUTUBE_DISCOVERY_QUALITY_PASS.md` | New | This document |

---

## Verification Checklist

✅ YouTube search still works end-to-end  
✅ Product keyword chips show intelligence-derived terms when a product is selected  
✅ Fallback example chips always visible  
✅ Score filter chips appear when results are present  
✅ Clicking a chip filters cards to that label  
✅ Filter clears on new search  
✅ Export button downloads a valid CSV file  
✅ Export respects the active score filter (count shown in button label)  
✅ Added prospects have structured notes in Discovery Workspace  
✅ Latest video row appears on channel cards (shows title + age)  
✅ Channels with unavailable playlist data degrade gracefully (no video row, no error)  
✅ Bulk add passes notes pre-fill for all channels  
✅ TypeScript: 0 errors (all packages)  
✅ No regression: history, dedup, bulk select, insights panel all intact  

---

## Quota Breakdown Per Search

```
search.list?q=...&type=channel&maxResults=25    = 100 units
channels.list?id=...&part=statistics,snippet,   =   1 unit
  contentDetails
playlistItems.list × N channels                 =   N units  (typically 10–20)
─────────────────────────────────────────────────────────────
Total                                           = ~115–125 units per search
Daily budget (10,000 units)                     = ~85 searches/day
```

For comparison, before Phase 4E: ~101 units → ~99 searches/day. The reduction is ~14 searches/day, which is well within normal usage patterns.

---

## Remaining TODOs (Phase 4F candidates)

1. **Keyword strength indicator** — show a small confidence badge ("High match" vs "Broad") next to each product keyword chip
2. **Save search results to DB** — persist results server-side for cross-session comparison
3. **Per-channel video feed** — show last 3 video titles + dates for richer activity signal
4. **Inactive channel filter** — automatically hide channels whose latest video is >90 days old (opt-in filter chip)
5. **Notes editing in Discovery Workspace** — allow editing the pre-filled notes from the workspace view
6. **Quota usage display** — show estimated remaining daily searches based on search count
