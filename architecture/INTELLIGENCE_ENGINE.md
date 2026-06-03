# Intelligence Engine — Influence Partner App

**Last Updated:** 2026-06-02  
**Current Phase:** 2 Sprint 1 (deterministic engine; LLM pending)

---

## Current Implementation (Phase 1D / Sprint 1)

**Location:** `artifacts/influence-partner/src/lib/productIntelligence.ts`

**Type:** Deterministic, category-keyed lookup

**Input:** 8 product fields
```typescript
{
  name, website, description, category,
  targetCustomer, mainBenefit, price, commissionOffer
}
```

**Processing:** 
1. Maps `category` to one of 9 predefined categories (Productivity, Fitness, Finance, Health, Food, Fashion, Travel, Gaming, Education)
2. Looks up pre-written template values for that category
3. Parses price string to compute revenue math
4. Returns 14+ output fields

**Limitations:**
- Category-only — no NLP on description or mainBenefit
- Fixed templates — same `outreachAngle` for all Productivity products
- Revenue math uses hardcoded conversion assumptions
- No competitor detection
- No commission attractiveness scoring

---

## Phase 2B Target: LLM-Backed Intelligence

### Trigger
`POST /api/products/:id/intelligence/refresh`

### Flow
```
1. Load product fields from DB
2. Build system prompt with product context
3. Call LLM (gpt-4o-mini or claude-haiku) with structured output request
4. Parse and validate response (Zod schema)
5. Write new snapshot to product_intelligence_snapshots (version++)
6. Return snapshot to caller
```

### LLM Output Schema (target)
```typescript
{
  mainMarket: string
  subMarket: string
  buyerPersona: { age, gender, interests, painPoints, platforms }
  recommendedCreatorCategories: Array<{ category, reason, fitLevel }>
  outreachAngle: string        // Personalized to THIS product
  whyTheseCreators: string     // Personalized to THIS product
  marketDifficulty: "Low" | "Medium" | "High"
  competitionLevel: "Low" | "Medium" | "High" | "Saturated"
  campaignOpportunityRating: "Excellent" | "Good" | "Fair" | "Poor"
  revenuePotentialLabel: "High" | "Medium" | "Low"
  revenuePotentialMonthly: string  // e.g. "$8,000–$15,000/mo"
  commissionAttractivenessScore: number  // 0–100
  commissionRecommendation: string
}
```

### Rate Limiting
- 5 refreshes per product per day (prevent runaway LLM costs)
- Cache aggressively — snapshots valid for 24h unless manually refreshed
- Use `gpt-4o-mini` or `claude-haiku` for cost control
- **Never call LLM from browser** — always proxy through Express API

### Fallback
If LLM call fails, fall back to current deterministic engine. Set `source = "deterministic"` in snapshot.

---

## Per-Product Creator Scoring (Phase 2B)

### Current (Sprint 1)
Formula-based using raw creator dimensions stored in DB:
```
fitScore = audienceMatch*0.30 + engScore*0.20 + platformFit*0.15 + productFit*0.20 + conflictScore*0.15
```
Dimensions (`audienceMatch`, `productFit`, etc.) are **manually set per creator** — they don't change when the active product changes.

### Target (Phase 2B)
Scores computed dynamically against the active product's intelligence snapshot:

```
1. Load creator profile
2. Load product intelligence snapshot (buyer persona, recommended categories)
3. Compute:
   - nicheOverlap = matchCreatorNicheToProductCategories(creator.niche, snapshot.recommendedCreatorCategories)
   - platformScore = platformInRecommendedList(creator.platform, snapshot.recommendedPlatforms)
   - audienceScore = personaMatch(creator.audienceFitSummary, snapshot.buyerPersona)
   - engagementScore = min(creator.engagementRate * 10, 100)
   - conflictScore = 100 - creator.competitiveConflict
4. Compute weighted composite
5. Store in creator_scores with productId
```

This means: **the same creator will get different scores for different products.** A fitness creator scores high for FitCoach Elite and low for WealthTrack.

---

## Prompt Injection Protection

All user-supplied product text (description, mainBenefit, targetCustomer) that enters LLM prompts must be:
1. Sanitized to remove prompt injection patterns (`IGNORE PREVIOUS INSTRUCTIONS`, `---`, `System:`)
2. Enclosed in XML-style delimiters in the prompt: `<product_description>...</product_description>`
3. System prompt must instruct the model to treat the delimited content as data, not instructions

---

## Cost Estimates (gpt-4o-mini at $0.15/1M input, $0.60/1M output)

| Operation | Est. tokens | Est. cost |
|---|---|---|
| Intelligence refresh (1 product) | ~1,500 in + ~800 out | ~$0.0007 |
| 100 refreshes/day | 150k in + 80k out | ~$0.07/day |
| Outreach generation (1 message) | ~1,200 in + ~400 out | ~$0.0004 |
| 500 messages/day | 600k in + 200k out | ~$0.21/day |

At current scale: < $10/month. Monitor via usage dashboard.
