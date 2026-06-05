# Phase 4C — YouTube Discovery MVP

## Overview

Adds a **live YouTube channel discovery** feed to the Influence Partner App. Users can search YouTube by keyword, review scored channels, and push the best ones directly into the Discovery Workspace — ready to qualify, add to Targets, and move through the pipeline.

```
YouTube Discovery (search + score)
↓
Discovery Workspace (qualify / reject)
↓
Targets
↓
Outreach
↓
Pipeline
```

---

## YouTube API Setup

### 1. Create a project in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. In the left nav: **APIs & Services → Library**
4. Search for **YouTube Data API v3** and click **Enable**

### 2. Create an API key

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → API Key**
3. (Optional but recommended) Restrict the key to **YouTube Data API v3**

### 3. Add the key to Replit

In the Replit Secrets panel (lock icon in the sidebar), add:

```
YOUTUBE_API_KEY = <your key here>
```

The API server reads `process.env.YOUTUBE_API_KEY`. If the key is missing, all `/api/youtube/search` calls return a `503` with a clear setup message.

### Quota

The YouTube Data API v3 has a **10,000 unit/day** free quota. Each search costs:

| Call | Units |
|---|---|
| `search.list` (1 request) | 100 units |
| `channels.list` (1 request) | 1 unit |

So one user search costs **~101 units**, giving roughly **99 searches/day** on the free tier. Results are cached client-side for 5 minutes via React Query to avoid re-hitting on page refresh.

---

## Architecture

### API Route: `GET /api/youtube/search`

File: `artifacts/api-server/src/routes/youtube.ts`

#### Request parameters

| Param | Required | Description |
|---|---|---|
| `keyword` | ✅ | Search term — e.g. "Mortgage Coach" |
| `partnerCategory` | No | Passed through for context; not used in scoring |
| `minimumSubscribers` | No | Integer filter — channels below this are excluded |

#### Flow

1. `search.list` — fetch up to 25 channel results for the keyword
2. Extract all `channelId` values from the results
3. `channels.list` — batch fetch statistics + snippet for all IDs in a single call (1 API unit)
4. Filter out channels with hidden subscriber counts or below `minimumSubscribers`
5. Score each channel (see Scoring below)
6. Sort by discovery score descending
7. Return normalised `YoutubeChannel[]` — **raw YouTube API response is never sent to the frontend**

#### Response shape

```json
{
  "channels": [
    {
      "channelId": "UCxxx",
      "channelName": "Personal Finance with Leila",
      "subscriberCount": 59300,
      "subscriberCountHidden": false,
      "channelUrl": "https://www.youtube.com/@personalfinancewithleila",
      "customUrl": "@personalfinancewithleila",
      "description": "I help overwhelmed people get out of debt...",
      "thumbnailUrl": "https://yt3.ggpht.com/...",
      "discoveryScore": 73,
      "discoveryLabel": "Good",
      "searchRank": 1
    }
  ],
  "total": 15
}
```

#### Error responses

| Condition | Status | Message |
|---|---|---|
| Key missing | 503 | "YouTube API key not configured…" |
| Missing keyword | 400 | "keyword is required" |
| Quota exceeded | 429 | "Search limit reached. YouTube API quota exceeded. Try again tomorrow." |
| Other API error | 503 | "YouTube search failed. Check your API key and try again." |

---

## Discovery Score Algorithm

Deterministic — no ML. Four components sum to a maximum of 100:

### 1. Base (always 10)

Every channel starts at 10.

### 2. Subscriber Count Score (0–40)

Optimal range is 50k–200k — large enough to have real reach, small enough to likely accept a 35–40% commission deal:

| Subscriber Range | Points |
|---|---|
| < 1k | 5 |
| 1k – 10k | 15 |
| 10k – 50k | 35 |
| **50k – 200k** | **40** (peak) |
| 200k – 500k | 30 |
| 500k – 1M | 22 |
| 1M – 5M | 12 |
| 5M+ | 5 |

> Rationale: Very large channels command lower commission rates and shorter promotion windows. The 50k–200k tier is the sweet spot for high-commission affiliate deals.

### 3. Search Rank Score (0–30)

Linear decay from 30 (rank 1) to 3 (last result). Channels YouTube surfaces first are more likely to be topically relevant.

```
rankScore = 30 - ((30 - 3) * index / (total - 1))
```

### 4. Keyword Relevance Score (0–20)

Splits the keyword into individual words and checks how many appear in `title + description`:

```
relevance = (matchedWords / totalWords) * 20
```

### Labels

| Score | Label |
|---|---|
| 75–100 | Excellent |
| 50–74 | Good |
| 25–49 | Moderate |
| 0–24 | Low |

---

## Data Mapping

When "Add To Discovery Workspace" is clicked, a `partner_prospect` record is created:

| prospect field | value |
|---|---|
| `name` | channel name |
| `company` | channel name |
| `website` | channel URL |
| `socialUrl` | channel URL |
| `platform` | `"YouTube"` |
| `partnerCategory` | selected category (if any) |
| `audienceSize` | `"59k subscribers"` (formatted) |
| `notes` | first 500 chars of channel description |
| `source` | `"YouTube"` |
| `status` | `"New Prospect"` |

The prospect then flows through the standard Discovery Workspace → Targets → Outreach → Pipeline path.

---

## React Query Cache Strategy

- Query key: `["youtube-search", keyword, partnerCategory, minimumSubscribers]`
- `staleTime`: 5 minutes — prevents re-fetching YouTube on page navigation/refresh
- `retry: false` — quota errors should not be retried automatically
- `refetchOnWindowFocus: false` — saves quota units

Prospect creation (`POST /api/prospects`) invalidates `['prospects']` so Discovery Workspace and Dashboard counts update immediately.

---

## Dashboard Metrics

A **YouTube Discovery** card appears on the Dashboard once at least one search has been performed. It reads from `localStorage` via `getYtStats()` (in `src/lib/ytStats.ts`) to avoid an extra API call.

| Metric | Source |
|---|---|
| Channels Found | cumulative from `localStorage` (updated on every search) |
| Channels Imported | `prospects.filter(p => p.source === "YouTube").length` — live DB count |
| Avg Discovery Score | cumulative weighted average from `localStorage` |

---

## Frontend Files

| File | Purpose |
|---|---|
| `artifacts/influence-partner/src/pages/YoutubeDiscovery.tsx` | Full page — search form, example keywords, results grid, score badges, add flow |
| `artifacts/influence-partner/src/lib/ytStats.ts` | `localStorage` helpers — `getYtStats()`, `recordYtSearch()` |
| `artifacts/influence-partner/src/lib/api-client.ts` | `youtubeSearch()` function + `YouTubeChannel` / `YouTubeSearchResponse` types |
| `artifacts/influence-partner/src/components/Layout.tsx` | Added "YouTube Discovery" nav item (Youtube icon) between Discovery Workspace and Targets |
| `artifacts/influence-partner/src/App.tsx` | Added `/youtube-discovery` route |
| `artifacts/influence-partner/src/pages/Dashboard.tsx` | YouTube Discovery metrics card |

---

## Quota Considerations

- **Default daily limit**: 10,000 units → ~99 searches/day per project
- **Quota reset**: midnight Pacific Time
- **Increasing quota**: Apply for a quota increase in Google Cloud Console → YouTube Data API v3 → Quotas
- **Best practices implemented**:
  - 5-minute client-side cache (React Query `staleTime`)
  - No auto-retry on quota errors
  - Single batched `channels.list` call per search (not per channel)
  - Clear 429 error message to the user

---

## Future Integration Path

### Adding Instagram or TikTok

When the time comes to add other platform APIs:

1. Create `artifacts/api-server/src/routes/<platform>.ts` with its own `GET /api/<platform>/search` route
2. Return the same normalised shape as `YoutubeChannel` (or extend the shared type)
3. Add a `createProspect` call with `source = "<Platform>"` and `platform = "<Platform>"`
4. The Discovery Workspace, Targets, Outreach, and Pipeline pages need **zero changes** — they operate on the prospect record, not the source

The `source` field on `partner_prospects` is already a free-text `text` column — no migration needed to support new sources.

### Modash / Creator.co

These data-provider APIs return pre-enriched creator profiles. The feed path is the same — normalise their response, call `POST /api/prospects`, set `source = "Modash"` etc. The scoring algorithm can be replaced by their proprietary scores if desired.

---

## Verification Checklist

✅ Page loads at `/youtube-discovery`  
✅ Nav item "YouTube Discovery" visible between Discovery Workspace and Targets  
✅ Search form — keyword required; partner category + min subscribers optional  
✅ Example keyword chips — click to populate keyword field  
✅ Results render as scored cards with thumbnail, subscriber count, rank, description  
✅ Score badge colour-coded (Excellent/Good/Moderate/Low)  
✅ "View Channel" opens YouTube in new tab  
✅ "Add To Discovery Workspace" creates prospect, button switches to "Added" (green check)  
✅ Added channels appear in `/discovery-workspace` with source = "YouTube"  
✅ Dashboard YouTube Discovery card appears after first search  
✅ "Channels Imported" count matches Discovery Workspace prospects where source = "YouTube"  
✅ API key missing → friendly 503 with setup instructions shown in UI  
✅ Quota exceeded → friendly 429 message shown in UI  
✅ No keyword → 400 returned; Search button disabled in UI  
✅ Existing Discovery Workspace — no regression  
✅ Existing Targets — no regression  
✅ Existing Outreach — no regression  
✅ Existing Pipeline — no regression  
✅ TypeScript: 0 errors (all packages)

---

## Remaining TODOs

1. **Keyword suggestions from product** — auto-populate keyword from selected product's `targetAudience` field
2. **Save searches** — persist search history so users can re-run previous queries
3. **Bulk add** — checkbox-select multiple channels → add all at once
4. **Deduplication** — warn if a channel URL already exists as a prospect
5. **Channel video preview** — show latest video title/date as an engagement signal
6. **OAuth-based YouTube Analytics** — for partners who grant access, pull real engagement metrics
