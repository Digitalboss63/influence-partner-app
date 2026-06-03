# Creator Discovery Strategy — Influence Partner App

**Version:** Phase 2.0  
**Date:** 2026-06-02

---

## Overview

Creator discovery is the hardest long-term engineering problem in this product. The value proposition — "find the right creators for your high-commission deal" — depends entirely on data quality. This document outlines a phased approach that starts with zero API dependencies and progressively adds richer discovery as the product matures.

---

## Phase-by-Phase Strategy

### Phase 2.0 — Manual + CSV Import (Zero External APIs)

**Why start here:**
- No API approvals required
- No rate limits
- Lets real users validate which creators convert *before* building expensive integrations
- Users already know who they want to target

**What to build:**

#### Manual Creator Entry
Extend the current "Add Creator" flow to support all fields:
- Name, handle, platform, follower count, engagement rate
- Niche, avatar URL, bio/description
- Source: `manual`

#### CSV Import
```
POST /api/creators/import/csv
Content-Type: multipart/form-data

Expected columns (case-insensitive header matching):
  name, handle, platform, followers, engagement_rate, niche, avatar_url, website
```

Provide a downloadable CSV template. Validate each row with Zod. Return a summary: `{ imported: 23, skipped: 2, errors: [{row: 5, reason: "..."}] }`.

**Where users get the CSV data:**
- Export from Modash, Grin, or Aspire (they may already have an existing tool)
- Manual Instagram/TikTok profile data copy-paste
- Future: automated export from platform APIs

#### URL Paste Enrichment (basic)
Accept a creator profile URL (YouTube channel URL, Instagram URL, TikTok URL) and extract the handle + platform automatically. Stats require API or scraping — Phase 2.1+.

---

### Phase 2.1 — YouTube Data API v3

**Why YouTube first:**
- Most permissive public API among the three platforms
- No user authentication required for read-only data
- Generous quota: 10,000 units/day free, ~$0.006/unit beyond that
- Creator search by keyword + category is fully supported

**API key setup:**
```
YOUTUBE_DATA_API_KEY=AIza...
```
Obtained from Google Cloud Console. Requires a Replit secret. Domain restriction recommended (lock to your domain).

**Key endpoints:**

```
# Search channels by keyword
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &type=channel
  &q=productivity+tools
  &videoCategoryId=28       ← Science & Tech
  &maxResults=50
  &key={YOUTUBE_DATA_API_KEY}

# Get channel stats by ID
GET https://www.googleapis.com/youtube/v3/channels
  ?part=snippet,statistics,brandingSettings
  &id={channelId}
  &key={YOUTUBE_DATA_API_KEY}

# Get recent videos (for content analysis)
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &channelId={channelId}
  &type=video
  &order=date
  &maxResults=10
  &key={YOUTUBE_DATA_API_KEY}
```

**Quota cost per operation:**
| Operation | Units |
|---|---|
| Channel search (50 results) | 100 |
| Channel stats fetch | 3 |
| Recent videos fetch | 100 |
| Full creator enrichment (search + stats + videos) | ~203 |

At 10,000 free units/day: ~49 full creator enrichments per day on the free tier.

**Rate limiting strategy:**
- Queue enrichment jobs. Don't call API synchronously during web requests.
- Cache results in `creators` table, refresh every 7 days max.
- Respect `X-RateLimit-*` headers.
- On quota exhaustion: return cached data with a "stats may be outdated" flag.

**What to extract and map to creator fields:**
```typescript
{
  externalId: channel.id,
  name: channel.snippet.title,
  handle: `@${channel.snippet.customUrl ?? channel.id}`,
  platform: 'YouTube',
  followerCount: parseInt(channel.statistics.subscriberCount),
  avatarUrl: channel.snippet.thumbnails.high.url,
  profileUrl: `https://youtube.com/channel/${channel.id}`,
  // engagement_rate derived from: (totalViews / subscriberCount / videoCount) * 100
  // niche: inferred from channel topic categories or manual classification
  source: 'youtube_api'
}
```

**Search to Creator Discovery UX:**

```
User inputs:
  - Search query: "productivity tools for remote workers"  
  - Follower range: 10K–500K
  - Country: US (optional)

System calls YouTube Data API v3 → returns up to 50 channels
System computes fit scores against active product
Displays in Creator Discovery grid alongside manually added creators
User clicks "Add to My List" → stored in DB, linked to user
```

---

### Phase 2.2 — Instagram Discovery

**The challenge:** Instagram's Graph API requires user authentication (OAuth) for any meaningful data. Public profile data is not available without a connected Instagram Business/Creator account.

**Option A: Instagram Graph API (official)**
- Requires: Instagram Business Account connected via Facebook Login
- Can access: your own account's data + accounts that follow you
- Cannot search all Instagram creators by keyword
- Good for: enriching creators you already know about

**Option B: Instagram Basic Display API**
- Deprecated as of September 2024. Do not implement.

**Option C: Third-party data providers (recommended for Phase 2)**

Instead of building Instagram scraping (which violates ToS), use a data provider:

| Provider | Coverage | Cost | API Quality |
|---|---|---|---|
| **Modash** | YT + IG + TikTok | $99/mo+ | Excellent |
| **Heepsy** | YT + IG + TikTok | $49/mo+ | Good |
| **Phyllo** | YT + IG + TikTok + more | Pay-per-call | Good |
| **HypeAuditor** | IG + TikTok | $299/mo+ | Excellent |

**Recommended approach:** Integrate Phyllo (pay-per-call) as the Phase 2.2 data provider. Phyllo has a Replit-friendly API and covers all three platforms.

```
POST /api/discovery/phyllo/search
Body: { platform, query, minFollowers, maxFollowers, category }
→ Phyllo API → normalize → store in creators table → compute fit scores
```

---

### Phase 2.3 — TikTok Research API

**Status:** Application-gated. Requires TikTok to approve developer access. Takes 2–4 weeks.

**Endpoint available post-approval:**
```
GET https://open.tiktokapis.com/v2/research/user/info/
  ?fields=display_name,bio_description,follower_count,video_count,likes_count,avatar_url
```

**Alternative before approval:** Use Phyllo (Phase 2.2) which covers TikTok without requiring direct API approval.

---

### Phase 2.4+ — Enrichment Pipeline

Once basic discovery is in place, add an automated enrichment pipeline:

```
Nightly job (cron):
  1. Find creators where stats_refreshed_at < 7 days ago
  2. For each: call platform API to refresh follower_count, engagement_rate
  3. Recompute creator_scores for all products
  4. Flag creators with significant changes (+/-20% followers, +/-2pp engagement)
  5. Notify user if a high-scoring creator's metrics have improved significantly
```

---

## Creator Score Computation Against Products

This is the critical missing link between Phase 1D and Phase 2. Currently, all creators have static scores regardless of the active product.

### Dynamic Scoring Algorithm (Phase 2)

```typescript
function computeProductRelativeFitScore(
  creator: Creator,
  product: Product,
  intelligence: ProductIntelligenceSnapshot
): CreatorScore {
  
  // 1. Audience match (30%) — how well creator's niche maps to product's buyer persona
  const audienceMatch = computeAudienceMatch(creator.niche, intelligence.recommendedCreatorCategories);
  
  // 2. Platform fit (15%) — does creator's platform match product's recommended platforms?
  const platformFit = computePlatformFit(creator.platform, intelligence.recommendedPlatforms);
  
  // 3. Product fit (20%) — creator's content directly relevant to product?
  const productFit = computeProductFit(creator.niche, intelligence.subCategory, product.category);
  
  // 4. Engagement score (20%) — quality signal
  const engScore = Math.min(creator.engagementRate * 10, 100);
  
  // 5. Conflict score (15%) — inverted competitive conflict
  const conflictScore = 100 - creator.competitiveConflict;

  const fitScore = Math.round(
    audienceMatch * 0.30 +
    engScore     * 0.20 +
    platformFit  * 0.15 +
    productFit   * 0.20 +
    conflictScore * 0.15
  );

  return {
    audienceMatch,
    platformFit,
    productFit,
    engagementScore: engScore,
    conflictScore,
    fitScore,
    fitLabel: getFitLabel(fitScore),
    // ...
  };
}

function computeAudienceMatch(
  creatorNiche: string,
  recommendedCategories: CreatorCategoryRec[]
): number {
  const primary = recommendedCategories.filter(c => c.fitLevel === 'Primary');
  const secondary = recommendedCategories.filter(c => c.fitLevel === 'Secondary');
  
  const niche = creatorNiche.toLowerCase();
  
  if (primary.some(c => niche.includes(c.category.toLowerCase()) || c.category.toLowerCase().includes(niche))) {
    return 90 + Math.random() * 10; // 90–100 for primary match
  }
  if (secondary.some(c => niche.includes(c.category.toLowerCase()))) {
    return 65 + Math.random() * 15; // 65–80 for secondary match
  }
  return 20 + Math.random() * 20; // 20–40 for no match
}
```

---

## Creator Data Quality Strategy

### Problem
Follower counts and engagement rates are lagging indicators. A creator who had 500K subscribers 3 months ago may have gained or lost significantly. Static data = stale scoring.

### Solution
Three data freshness tiers:

| Tier | Refresh interval | Source |
|---|---|---|
| Hot | Real-time on demand | Platform API call on creator page view |
| Warm | Weekly | Nightly enrichment job |
| Cold | On add | Initial import, never auto-refreshed |

Display `stats_refreshed_at` on creator cards with a "Refresh Stats" button for hot updates.

### Engagement Rate Normalisation

Different platforms have different engagement norms:
```
YouTube: 3–6% is healthy (views/subscribers)
TikTok: 8–15% is healthy (likes+comments/views)  
Instagram: 2–5% is healthy (likes+comments/followers)
```

Normalise before scoring:
```typescript
function normaliseEngagementRate(rate: number, platform: Platform): number {
  const norms = { YouTube: 4.5, TikTok: 11, Instagram: 3.5 };
  return (rate / norms[platform]) * 50; // returns 0–100, 50 = at-norm
}
```

---

## Fake/Bot Detection

When enriching creators from APIs, flag suspicious accounts:

```typescript
function getFakeFollowerRisk(creator: {
  followerCount: number;
  engagementRate: number;
  postsPerMonth: number;
}): 'Low' | 'Medium' | 'High' {
  const expectedEngagement = { YouTube: 4.5, TikTok: 11, Instagram: 3.5 };
  
  // Very high followers + very low engagement = suspicious
  if (creator.followerCount > 100_000 && creator.engagementRate < 0.5) return 'High';
  
  // Very low posts + high followers = bought followers
  if (creator.followerCount > 50_000 && (creator.postsPerMonth ?? 0) < 1) return 'Medium';
  
  return 'Low';
}
```

Display risk level on creator cards. Auto-downgrade fit score for Medium/High risk creators.

---

## Search UX Strategy

### Phase 2.0 (Manual)
- Filter by niche, platform, follower range, fit score
- Sort by fit score (default), followers, engagement rate
- Group by pipeline stage

### Phase 2.1 (YouTube Search)
- Natural language search: "productivity YouTubers for remote workers"
- Advanced filters: subscriber range, upload frequency, country, language
- "Discover More Like This" — find similar channels to an existing high-scoring creator

### Phase 2.2+ (Multi-Platform)
- Unified search across YouTube, Instagram, TikTok
- Platform-specific filters
- Export selected creators to CSV
- Bulk add to campaign pipeline

---

## Niche Taxonomy

A standardised niche taxonomy prevents mismatches between creator niches and product categories.

```typescript
export const NICHE_TAXONOMY = {
  Tech: ['Tech Reviews', 'AI Tools', 'Developer/Coding', 'Gadgets', 'Cybersecurity'],
  Productivity: ['Productivity/Workflow', 'Note-Taking', 'Time Management', 'Organisation'],
  Finance: ['Personal Finance', 'Investing', 'Crypto/Web3', 'Frugality/FIRE', 'Real Estate'],
  Fitness: ['Workout/Training', 'Nutrition', 'Weight Loss', 'Running/Cycling', 'Yoga/Mindfulness'],
  Health: ['Mental Health', 'Sleep', 'Biohacking', 'Longevity', 'Women\'s Health'],
  Beauty: ['Skincare', 'Makeup/GRWM', 'Haircare', 'Clean Beauty', 'Fashion'],
  Gaming: ['PC Gaming', 'Mobile Gaming', 'Esports', 'Game Reviews', 'Streaming/Twitch'],
  Lifestyle: ['Travel', 'Minimalism', 'Home/Interior', 'Vlogging', 'Relationships'],
  Business: ['Entrepreneurship', 'Side Hustle', 'Marketing', 'SaaS/Startups', 'Career Growth'],
  Food: ['Cooking', 'Baking', 'Restaurant Reviews', 'Diet/Clean Eating'],
  Education: ['Online Courses', 'Language Learning', 'Science', 'History'],
};
```

Map incoming creator niches to this taxonomy on import. Expose as the filter options in Creator Discovery.

---

## Build Order Within Discovery

1. **Manual add + CSV import** (Sprint 4, Week 1–2)
2. **Niche taxonomy + improved scoring** (Sprint 4, Week 2)
3. **YouTube Data API search** (Sprint 4, Week 3–4)
4. **Creator enrichment + stats refresh** (Sprint 4, Week 4)
5. **Phyllo integration for IG + TikTok** (Sprint 5, based on demand)
6. **Fake follower detection** (Sprint 5)
7. **"More Like This" discovery** (Sprint 6+)
