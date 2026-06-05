# Phase 4D — YouTube Discovery Usability Cleanup

## Overview

Improves the YouTube Discovery page with five usability upgrades before adding another platform:

1. **Product-suggested keywords** — auto-generate search chips from the selected product
2. **Search history** — persist and re-run previous searches
3. **Bulk add** — checkbox-select multiple channels and add them all at once
4. **Deduplication warning** — detect channels already in the Discovery Workspace
5. **Channel insights panel** — match reason, why it fits, outreach angle, next action

---

## 1. Product-Suggested Keywords

### What it does

When a product is selected in the app, the YouTube Discovery page generates up to 7 keyword chips derived from the product's own data:

| Source field | Example chip |
|---|---|
| `product.name` | "MortgageEdge Pro" |
| `product.category` | "Real Estate Education" |
| `product.targetCustomer` (first phrase) | "First-time homebuyers" |
| `product.mainBenefit` (first phrase) | "Save thousands on closing costs" |
| `recommendedCreatorCategories` (Primary/Secondary) | "Podcast Host", "YouTuber" |

These chips appear above the generic example keywords in a highlighted "From [Product Name]:" row. Clicking any chip populates the keyword field instantly.

If no product is selected, only the generic fallback keyword chips are shown.

### Implementation

Function `buildProductKeywords(product)` in `YoutubeDiscovery.tsx`:
- Splits multi-clause values on `,;./\n` and takes the first segment
- Deduplicates case-insensitively
- Limits to 7 chips

---

## 2. Search History

### What it does

Every successful search is saved to `localStorage` under the key `ip_yt_history` (max 10 entries). The most recent search bubbles to the top; exact duplicates (same keyword + category + minSubs) are replaced rather than appended.

Each entry stores:

| Field | Type | Description |
|---|---|---|
| `id` | string | `Date.now()` timestamp string |
| `keyword` | string | Search term |
| `partnerCategory` | string | `"_none_"` or category name |
| `minimumSubscribers` | number | 0 if "Any" |
| `resultCount` | number | Channels returned |
| `avgScore` | number | Average discovery score |
| `searchedAt` | ISO string | When the search ran |

### UI

A "Recent Searches" card appears above the results (if history is non-empty). Each row shows:
- Keyword (bold)
- Category badge, min-subs, result count, avg score (muted)
- Relative timestamp ("2h ago", "3d ago")
- **Run Again** button — pre-fills the form and triggers search immediately
- Trash icon — removes the entry from localStorage

### Implementation

Added to `artifacts/influence-partner/src/lib/ytStats.ts`:

```typescript
export interface SearchHistoryEntry { id, keyword, partnerCategory, minimumSubscribers, resultCount, avgScore, searchedAt }

getSearchHistory()         // reads from localStorage
addSearchHistory(entry)    // deduplicates, prepends, trims to 10
deleteSearchHistoryEntry(id) // removes single entry
```

`addSearchHistory()` is called inside the React Query `queryFn` after a successful YouTube API response. Since results are cached for 5 minutes via `staleTime`, the function is only called once per unique search — not on every component re-render.

---

## 3. Bulk Add

### What it does

When search results are displayed, a checkbox appears on every channel card that isn't already added or a duplicate. A **"Select all"** toggle and **"Add Selected (N)"** button appear in the results header bar.

Clicking "Add Selected (N)":
1. Filters the selected IDs to those still eligible (not added, not duplicate)
2. Calls `createProspect` sequentially for each (to avoid overwhelming the API)
3. Marks each successfully added channel as "Added ✓"
4. Clears the selection
5. Invalidates `['prospects']` once at the end
6. Shows a toast with count: "3 channels added to Discovery Workspace"

Channels that are already added or already in the workspace are automatically excluded from the bulk operation — they don't count toward failures.

### State

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [isBulkAdding, setIsBulkAdding] = useState(false);
```

Selection is cleared when a new search is triggered.

---

## 4. Deduplication Warning

### What it does

Before showing the Add button on a channel card, the page checks whether a prospect already exists with a matching `website` or `socialUrl`. If so:

- A yellow **"Already in Discovery Workspace"** badge appears in the channel's tags row
- The Add button is replaced by an amber **"Already in Workspace"** disabled button
- The channel's checkbox is disabled so it can't be bulk-selected

### Implementation

```typescript
// Fetch existing prospects (staleTime: 30s)
const { data: prospects = [] } = useQuery({
  queryKey: ["prospects"],
  queryFn: () => getProspects(),
  staleTime: 30_000,
});

// Build URL set for O(1) lookup
const existingUrls = useMemo(() => {
  const urls = new Set<string>();
  for (const p of prospects) {
    if (p.website)   urls.add(p.website);
    if (p.socialUrl) urls.add(p.socialUrl);
  }
  return urls;
}, [prospects]);

const isDuplicate = (ch: YouTubeChannel) => existingUrls.has(ch.channelUrl);
```

The deduplication set is recomputed whenever the prospects query refreshes (which happens after any add operation, since `['prospects']` is invalidated).

---

## 5. Channel Insights Panel

### What it does

Each channel card has a **"See analysis"** toggle. When expanded, a panel shows four fields computed deterministically from the channel data:

| Field | Description |
|---|---|
| **Match Reason** | Search rank, subscriber count, and raw score |
| **Why This Fits** | Subscriber-tier narrative (sweet spot, growing, established, etc.) |
| **Suggested Outreach Angle** | Pitch framing based on subscriber tier |
| **Recommended Next Action** | Action verb keyed to score label (Excellent/Good/Moderate/Low) |

### Algorithm

```typescript
function computeInsights(ch: YouTubeChannel): ChannelInsights {
  // Match reason — always shown
  matchReason = `#${searchRank} result · ${fmt} subscribers · score ${score}/100`;

  // Why it fits — subscriber tier buckets
  if (50k ≤ subs < 200k)   → "Sweet spot for 35–40% commission deals…"
  if (10k ≤ subs < 50k)    → "Engaged niche audience — early-partner potential…"
  if (200k ≤ subs < 1M)    → "Established creator — hybrid flat + commission…"
  if (subs ≥ 1M)           → "High-reach — brand awareness play…"
  else                      → "Small but growing — very low acquisition cost…"

  // Outreach angle — same tier logic
  if (50k ≤ subs < 200k)   → "Lead with revenue projection…"
  if (subs < 10k)           → "Exclusive early-partner deal…"
  if (subs ≥ 1M)            → "Sponsored series + revenue share hybrid…"
  else                      → "Uncapped performance commission…"

  // Next action — keyed to discoveryLabel
  Excellent → "Add now → Qualify → Move to Targets"  (emerald)
  Good      → "Add and review recent videos…"         (blue)
  Moderate  → "Review channel content first"          (amber)
  Low       → "Low priority — monitor or skip"        (gray)
}
```

Insights are computed client-side — no extra API calls.

### UI state

```typescript
const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
```

Each channel card independently toggles its own insight panel. The set is cleared when a new search is triggered.

---

## Files Changed

| File | Status | Changes |
|---|---|---|
| `artifacts/influence-partner/src/lib/ytStats.ts` | Edited | Added `SearchHistoryEntry` type + `getSearchHistory()`, `addSearchHistory()`, `deleteSearchHistoryEntry()` |
| `artifacts/influence-partner/src/pages/YoutubeDiscovery.tsx` | Rewritten | All 5 features integrated; prospects query for dedup; bulk-add state; insights toggle; product keywords |

---

## localStorage Keys

| Key | Purpose | Max size |
|---|---|---|
| `ip_yt_stats` | Cumulative search stats (found, totalScore, scoreCount, lastSearchAt) | tiny |
| `ip_yt_history` | Search history entries array | max 10 entries |

---

## Verification Checklist

✅ Search form works — keyword required, category + min-subs optional  
✅ Product keywords appear when a product is selected (chips labelled "From [Product]:")  
✅ Fallback example keywords always visible  
✅ Search history appears after first search  
✅ "Run Again" in history re-fills form and triggers search immediately  
✅ Delete (trash) removes history entry  
✅ Results show checkboxes on all eligible cards  
✅ "Select all" / "Deselect all" toggles correctly  
✅ "Add Selected (N)" bulk-adds and shows toast with count  
✅ Cards already added show "Added ✓" (emerald), not re-selectable  
✅ Channels already in workspace show amber "Already in Discovery Workspace" badge + disabled button  
✅ "See analysis" expands insights panel per card  
✅ Insights panel shows all 4 fields with correct tier-based text  
✅ New search clears selection + expanded insights  
✅ Existing YouTube search still works end-to-end  
✅ Discovery Workspace shows YouTube prospects correctly  
✅ Dashboard YouTube metrics update after adding channels  
✅ Existing Targets / Outreach / Pipeline — no regression  
✅ TypeScript: 0 errors (all packages)

---

## Remaining TODOs (Phase 4E candidates)

1. **Keyword suggestions from product intelligence** — use `productIntelligence.ts` output to generate richer, niche-specific search terms
2. **Save searches to DB** — persist history server-side per user (requires auth)
3. **Channel video preview** — show latest video title/date as additional engagement signal
4. **Notes pre-fill from insights** — when adding to workspace, pre-populate the prospect notes with the "Why This Fits" insight text
5. **Filter results by score** — slider or quick-filter to show only Excellent/Good results
6. **Export results to CSV** — download current search results for offline review
