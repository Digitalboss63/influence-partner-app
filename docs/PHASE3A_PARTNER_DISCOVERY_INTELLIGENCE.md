# Phase 3A — Partner Discovery Intelligence

## Overview

Phase 3A adds a **Partner Acquisition Intelligence Layer** to the Influence Partner App. Instead of searching for random influencers, the app now tells users exactly *which types of partners to pursue* for a specific product — and *why* — before any creator outreach begins.

## Goals

- Surface the best partner categories for any product (no APIs, no LLMs)
- Give users a clear "what to do next" at every step
- Filter creators by partner type in the Discovery page
- Surface a summary on the Dashboard

## New Pages

### `/partner-strategy`

**File:** `artifacts/influence-partner/src/pages/PartnerStrategy.tsx`

Four sections:

| Section | Content |
|---|---|
| Ideal Partner Categories | Cards for every partner type grouped by Tier 1/2/3 |
| Priority Ranking | Three-column tier summary with reasoning |
| Deal Structure | Affiliate / JV / Revenue Share / Strategic Referral recs |
| Audience Alignment | Four score metrics with progress bars |

## New Components

All components are inline in `PartnerStrategy.tsx`:

- `PartnerCategoryCard` — full detail card per partner type (tier, commission, conversion quality, why fit, outreach angle)
- `DealCard` — deal structure card with best-fit badge
- `ScoreBar` — labelled progress bar for audience alignment metrics

## Intelligence Engine

**File:** `artifacts/influence-partner/src/lib/partnerIntelligence.ts`

### Exported types

```ts
PartnerTier          // 1 | 2 | 3
ConversionQuality    // "High" | "Medium" | "Low"
DealType             // "Affiliate" | "JV Partner" | "Revenue Share" | "Strategic Referral"
AcquisitionDifficulty // "Easy" | "Medium" | "Hard"
RevenueOpportunity   // "Low" | "Moderate" | "High" | "Exceptional"
PartnerBucket        // 6 broad category buckets for Discovery filter
PartnerCategory      // Full partner type definition
DealStructureRec     // Deal structure recommendation
PartnerIntelligenceResult  // Aggregate output
```

### Exported functions / constants

| Export | Purpose |
|---|---|
| `generatePartnerIntelligence(product)` | Main engine — takes a product, returns full intelligence |
| `NICHE_TO_PARTNER_BUCKET` | Maps creator niche → `PartnerBucket[]` for Discovery filter |
| `ALL_PARTNER_BUCKETS` | Ordered list of all 6 buckets |

### Coverage

One set of 8 partner categories (Tier 1/2/3) per product category:

| Product Category | Tier 1 Examples | Revenue Opp. | Difficulty |
|---|---|---|---|
| Productivity | Course Creator, Productivity YouTuber, Business Educator | High | Medium |
| Tech | Course Creator, Developer Educator, Tech YouTuber | High | Hard |
| Finance | Personal Finance Educator, Credit Coach, Mortgage Coach | Exceptional | Medium |
| Fitness | Fitness Coach, Wellness Educator, Personal Trainer | High | Easy |
| Health | Wellness Educator, Herbal Practitioner, Alt Health Channel | High | Easy |
| Beauty | Beauty Educator, Skincare Expert, Lifestyle Blogger | Moderate | Easy |
| Gaming | Gaming Streamer, Game Review Channel, Esports Creator | Moderate | Easy |
| Lifestyle | Lifestyle Blogger, Community Owner, Podcast Host | Moderate | Easy |
| Other | Community Owner, Course Creator, Podcast Host | Moderate | Medium |

### Scoring logic

Each `PartnerCategory` has three per-category scores (0–100):
- `audienceMatchScore` — how well the partner's audience maps to the product's target customer
- `buyingIntentScore` — how actively the audience purchases in this category
- `trustScore` — how much authority the creator has in their niche

`overallConversionPotential` is derived as a weighted blend:
```
conversionPotential = audienceMatch × 0.40 + buyingIntent × 0.35 + trust × 0.25
```

## Dashboard Enhancement

**File:** `artifacts/influence-partner/src/pages/Dashboard.tsx`

A new "Partner Discovery Intelligence" section is inserted **between Campaign Workflow and Product Intelligence Preview** when a product is selected. It shows:

- Top partner category name
- Best audience type description
- Recommended commission
- Acquisition difficulty badge
- Revenue opportunity level
- CTA: "View Recommended Partners →" linking to `/partner-strategy`

## Discover Page Enhancement

**File:** `artifacts/influence-partner/src/pages/CreatorDiscovery.tsx`

A **Partner Category** filter is added to the existing filter row. It uses 6 broad `PartnerBucket` values:

- Business & Productivity
- Finance & Credit
- Fitness & Wellness
- Beauty & Lifestyle
- Gaming & Tech
- Community & Education

Creator niches are mapped to these buckets via `NICHE_TO_PARTNER_BUCKET` from the intelligence engine. Selecting a bucket filters the creator grid to show only creators whose niche maps to that bucket.

## Navigation

A "Partner Strategy" item (Compass icon) is added to the sidebar navigation between "Discover Creators" and "Outreach".

## Rules — no external dependencies

- No API calls
- No LLM calls
- No scraping
- All logic is deterministic and runs client-side
- Scores and recommendations are keyed on the product's `category` field

## Future integration opportunities

1. **Real creator search**: Replace static 15-creator list with a live search filtered by partner category (YouTube API, Creator.co, Modash, etc.)
2. **Score personalisation**: Feed actual product analytics (conversion rate, AOV, churn) into the scoring to adjust partner recommendations dynamically
3. **Outreach automation**: Auto-generate outreach sequences per partner category and push to email/CRM
4. **Market data**: Pull live influencer engagement rates and category competition data to sharpen difficulty/opportunity scores
5. **Saved strategies**: Persist the partner strategy to the DB (`partner_strategies` table) so different products can be compared side-by-side
