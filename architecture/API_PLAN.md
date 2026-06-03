# API Route Plan — Influence Partner App

**Version:** Phase 2.0 — Sprint 1 Implemented  
**Server:** Express 5 + Zod validation  
**Base path:** `/api`  
**Auth:** Session-based (SESSION_SECRET set, not yet wired to routes)  
**Date updated:** 2026-06-03

---

## Sprint 1 — Routes Now Live

| Route group | File | Status |
|---|---|---|
| GET/POST/PUT/DELETE `/api/products` | `routes/products.ts` | ✅ Live |
| GET/POST/PUT/DELETE `/api/creators` + `/api/creators/:id/scores` | `routes/creators.ts` | ✅ Live |
| GET/POST/PUT/DELETE `/api/pipeline` + events | `routes/pipeline.ts` | ✅ Live |
| GET/POST/DELETE `/api/outreach` | `routes/outreach.ts` | ✅ Live |
| GET `/api/healthz` | `routes/health.ts` | ✅ Live |

All routes use `drizzle-zod` insert schemas for input validation, return `{ error }` on failure, and use Express 5 async error propagation. No auth middleware applied yet (Sprint 2).

---

---

## Conventions

- All routes require authentication unless marked `[public]`.
- All request bodies validated with Zod schemas (generated from OpenAPI spec via Orval).
- All responses return `{ data, error }` envelope.
- Errors use standard HTTP status codes + `{ error: { code, message, details? } }`.
- Timestamps in ISO 8601 UTC.
- IDs are UUID v4.

---

## Authentication — `/api/auth`

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` [public] | Create account with email + password |
| POST | `/api/auth/login` [public] | Start session, returns user |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Return current authenticated user |
| PUT | `/api/auth/me` | Update display name, plan |
| POST | `/api/auth/password/change` | Change password (requires current password) |

**Session flow:**
```
POST /api/auth/login
  Body: { email, password }
  Response: { data: { id, email, displayName, plan } }
  Sets: httpOnly session cookie (SESSION_SECRET)
```

---

## Products — `/api/products`

| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | List all products for current user |
| POST | `/api/products` | Create a new product |
| GET | `/api/products/:id` | Get product with latest intelligence snapshot |
| PUT | `/api/products/:id` | Update product metadata |
| DELETE | `/api/products/:id` | Archive product (soft delete) |
| POST | `/api/products/:id/analyze` | Re-run intelligence engine, create new snapshot |
| GET | `/api/products/:id/intelligence` | Get latest intelligence snapshot |
| GET | `/api/products/:id/intelligence/history` | List all snapshots (paginated) |
| GET | `/api/products/:id/creators` | List creators scored against this product |

**Key request/response shapes:**

```typescript
// POST /api/products
body: {
  name: string;
  website?: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
}
response: { data: Product }

// POST /api/products/:id/analyze
body: { useLLM?: boolean }  // false = template engine, true = LLM-backed
response: {
  data: ProductIntelligenceSnapshot,
  meta: { engineVersion: string, llmModel?: string, computedInMs: number }
}
```

---

## Creators — `/api/creators`

| Method | Route | Description |
|---|---|---|
| GET | `/api/creators` | List all creators (paginated, filterable) |
| POST | `/api/creators` | Add creator manually |
| GET | `/api/creators/:id` | Get creator with all scores |
| PUT | `/api/creators/:id` | Update creator data |
| DELETE | `/api/creators/:id` | Remove creator |
| POST | `/api/creators/import/csv` | Bulk import from CSV upload |
| POST | `/api/creators/import/url` | Import creator from profile URL (Phase 2.1+) |
| GET | `/api/creators/:id/scores` | Get all product scores for this creator |
| POST | `/api/creators/:id/refresh` | Re-fetch platform stats (Phase 2.1+) |

**Query params for GET /api/creators:**
```
?productId=uuid        → include score against this product
?platform=YouTube      → filter by platform
?niche=Tech            → filter by niche
?minFitScore=80        → filter by score (requires productId)
?minFollowers=10000
?maxFollowers=500000
?creatorType=Micro
?page=1&limit=25
?sortBy=fitScore&sortDir=desc
```

---

## Scoring — `/api/scoring`

| Method | Route | Description |
|---|---|---|
| POST | `/api/scoring/product/:productId` | Compute/refresh fit scores for all creators against a product |
| POST | `/api/scoring/creator/:creatorId/product/:productId` | Score a single creator against a product |
| GET | `/api/scoring/product/:productId/top` | Get top N creators by fit score |

**Score computation request:**
```typescript
// POST /api/scoring/product/:productId
body: { force?: boolean }  // force=true recomputes even if fresh scores exist
response: {
  data: {
    computed: number,  // number of scores updated
    cached: number     // number of scores already fresh
  }
}
```

**Notes:**
- Scores are cached in `creator_scores` table. Recomputed when product intelligence changes or creator stats are updated.
- `scoring_version` field invalidates stale caches when the algorithm is updated.

---

## Pipeline — `/api/pipeline`

| Method | Route | Description |
|---|---|---|
| GET | `/api/pipeline/campaign/:campaignId` | Get all entries for a campaign, grouped by stage |
| POST | `/api/pipeline/campaign/:campaignId/entries` | Add a creator to a campaign |
| DELETE | `/api/pipeline/entries/:entryId` | Remove entry from pipeline |
| PUT | `/api/pipeline/entries/:entryId/stage` | Move creator to a new stage |
| GET | `/api/pipeline/entries/:entryId/events` | Get full stage history for this entry |
| POST | `/api/pipeline/entries/:entryId/notes` | Append a note to an entry |
| POST | `/api/pipeline/entries/:entryId/deal` | Record deal terms (fires when moving to Active) |
| GET | `/api/pipeline/entries/:entryId/deal` | Get deal terms for an active entry |

**Stage change request:**
```typescript
// PUT /api/pipeline/entries/:entryId/stage
body: {
  stage: PipelineStage;
  note?: string;
}
response: {
  data: {
    entry: PipelineEntry,
    event: PipelineEvent
  }
}
```

**Deal terms request:**
```typescript
// POST /api/pipeline/entries/:entryId/deal
body: {
  commissionPct: number;
  dealType: 'Revenue Share' | 'CPA' | 'Flat Fee' | 'Hybrid';
  flatFeeUsd?: number;
  monthlyMinimumUsd?: number;
  dealStartDate: string;  // ISO date
  dealEndDate?: string;
  exclusivity: boolean;
  contractUrl?: string;
  notes?: string;
}
```

---

## Outreach — `/api/outreach`

| Method | Route | Description |
|---|---|---|
| GET | `/api/outreach` | List all outreach messages for current user |
| GET | `/api/outreach/entry/:entryId` | Get all messages for a pipeline entry |
| POST | `/api/outreach/generate` | Generate a new outreach message |
| POST | `/api/outreach/:messageId/save` | Save a generated draft |
| PUT | `/api/outreach/:messageId` | Edit a saved message |
| DELETE | `/api/outreach/:messageId` | Delete a message |
| PUT | `/api/outreach/:messageId/status` | Update status (sent/replied/ignored) |

**Generate request:**
```typescript
// POST /api/outreach/generate
body: {
  creatorId: string;
  productId: string;
  channel: OutreachChannel;
  tone: OutreachTone;
  useLLM?: boolean;     // true = LLM, false = template fallback
  save?: boolean;       // auto-save as draft if true
}
response: {
  data: {
    message: string;
    subjectLine?: string;
    generationMethod: 'template' | 'llm';
    savedMessageId?: string;  // if save=true
  }
}
```

**LLM generation notes:**
- System prompt includes: product intelligence snapshot + creator score breakdown + channel constraints
- User prompt: "Write a [tone] [channel] outreach message"
- Streamed response for perceived performance (use Server-Sent Events or chunked transfer)
- Rate limited: 20 LLM generations per user per day on free plan, 200 on pro

---

## Campaigns — `/api/campaigns`

| Method | Route | Description |
|---|---|---|
| GET | `/api/campaigns` | List all campaigns for current user |
| POST | `/api/campaigns` | Create campaign linked to a product |
| GET | `/api/campaigns/:id` | Get campaign with pipeline summary |
| PUT | `/api/campaigns/:id` | Update campaign metadata |
| DELETE | `/api/campaigns/:id` | Archive campaign |
| GET | `/api/campaigns/:id/stats` | Revenue + partner count + conversion estimates |

---

## Dashboard — `/api/dashboard`

Single aggregated endpoint to power the Dashboard page. Replaces all the inline calculations currently in `Dashboard.tsx`.

| Method | Route | Description |
|---|---|---|
| GET | `/api/dashboard` | Full dashboard metrics for current user |

**Response shape:**
```typescript
{
  data: {
    // Revenue projection
    activePartnerCount: number;
    estimatedMonthlyConversions: number;
    estimatedGrossRevenue: number;
    estimatedNetProfit: number;
    estimatedPartnerPayouts: number;

    // Recommended action
    recommendedNextAction: {
      type: 'contact_creator' | 'follow_up' | 'review_pipeline';
      creatorId?: string;
      reason: string;
    };

    // Campaign workflow progress
    workflowSteps: { step: string; complete: boolean }[];

    // Active product intelligence preview
    activeProductIntelligence: ProductIntelligenceSnapshot | null;

    // Top opportunities
    topCreators: CreatorWithScore[];

    // Pipeline summary by stage
    pipelineSummary: Record<PipelineStage, number>;
  }
}
```

---

## Discovery — `/api/discovery`

Phase 2.1+ routes. Not implemented in Phase 2.0.

| Method | Route | Description | Phase |
|---|---|---|---|
| GET | `/api/discovery/youtube/search` | Search YouTube channels by keyword | 2.1 |
| GET | `/api/discovery/youtube/channel/:channelId` | Fetch channel stats | 2.1 |
| GET | `/api/discovery/instagram/profile/:handle` | Fetch Instagram profile (limited) | 2.2 |
| GET | `/api/discovery/tiktok/profile/:handle` | Fetch TikTok profile | 2.3 |
| POST | `/api/discovery/enrich/:creatorId` | Re-fetch all platform stats for a creator | 2.1+ |

**YouTube search params:**
```
?q=productivity+tools    → keyword query
?category=28             → YouTube category ID (28 = Science & Tech)
?minSubscribers=10000
?maxSubscribers=500000
?country=US
&limit=25
```

---

## Healthcheck

| Method | Route | Description |
|---|---|---|
| GET | `/api/healthz` | Server health + DB connectivity |

```json
{
  "status": "ok",
  "db": "connected",
  "uptime": 12345,
  "version": "1.0.0"
}
```

---

## Rate Limiting Strategy

```
All routes:           100 req / minute per IP
POST /api/auth/*:     10 req / minute per IP (brute force protection)
POST /api/*/analyze:  5 req / minute per user (LLM cost control)
POST /api/outreach/generate: 
  - free plan:  20/day per user
  - pro plan:   200/day per user
POST /api/scoring/*:  10 req / minute per user
```

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `AUTH_REQUIRED` | 401 | No session or session expired |
| `FORBIDDEN` | 403 | Resource belongs to a different user |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `LLM_UNAVAILABLE` | 503 | LLM provider returned an error |
| `LLM_QUOTA_EXCEEDED` | 402 | User's daily LLM quota exhausted |
| `PLATFORM_API_ERROR` | 502 | YouTube/Instagram/TikTok API returned an error |

---

## OpenAPI Contract

The API contract should be defined first in `lib/api-spec/openapi.yaml` (contract-first).  
Run `pnpm --filter @workspace/api-spec run codegen` to regenerate:
- React Query hooks (`@workspace/api-client-react`)
- Zod request/response schemas (`@workspace/api-spec`)

This ensures the frontend and backend types never diverge.
