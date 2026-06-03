# Intelligence Engine — Technical Specification

**Version:** Phase 2.0  
**Location (current):** `artifacts/influence-partner/src/lib/productIntelligence.ts`  
**Location (Phase 2):** `artifacts/api-server/src/lib/productIntelligence.ts` (server-side)  
**Date:** 2026-06-02

---

## Current State (Phase 1D)

### Architecture
```
ProductForm (8 fields)
  ↓
generateProductIntelligence(data: ProductForm): ProductIntelligence
  ↓
CategoryKey lookup (9 categories)
  ↓
Fixed template hydration + price-based revenue math
  ↓
14 output fields
```

### Input Fields
| Field | Type | Used For |
|---|---|---|
| `name` | string | Narrative personalisation |
| `website` | string | Not currently used in logic |
| `description` | string | Not currently parsed — future NLP target |
| `category` | string | Primary lookup key (9 values) |
| `targetCustomer` | string | Narrative personalisation |
| `mainBenefit` | string | Outreach angle, revenue calculation |
| `price` | string | Revenue estimates, commission attractiveness |
| `commissionOffer` | number | Commission range, partner acquisition |

### Output Fields (14)
| Field | Generation Method |
|---|---|
| `mainMarket` | Hardcoded per category |
| `subMarket` | Hardcoded per category |
| `buyerPersona` | Hardcoded per category |
| `recommendedCreatorCategories` | Hardcoded per category (4 entries) |
| `recommendedPlatforms` | Hardcoded per category |
| `recommendedCommissionRange` | Derived from `commissionOffer` ±5% |
| `outreachAngle` | Template string interpolating name/targetCustomer/mainBenefit |
| `whyTheseCreators` | Template string |
| `marketDifficulty` | Hardcoded per category |
| `marketDifficultyReason` | Hardcoded per category |
| `competitionLevel` | Hardcoded per category |
| `competitionReason` | Hardcoded per category |
| `campaignOpportunityRating` | Hardcoded per category |
| `campaignOpportunityReason` | Hardcoded per category |
| `revenuePotentialLabel` | Derived from price × 8 partners × 45 conversions |
| `revenuePotentialMonthly` | Same formula |
| `revenuePotentialReason` | Template string |
| `estimatedPartnerAcquisitionPotential` | Price-tier lookup (3 tiers) |
| `partnerAcquisitionReason` | Template string |

### Key Limitations
1. **Category is the only signal.** Two products in "Finance" — a robo-advisor and a crypto wallet — get identical intelligence.
2. **Description field is entirely unused.** The richest input is ignored.
3. **Revenue constants are fictional.** `avgMonthlyConversions = 45`, `partnersEstimate = 8`.
4. **No price sensitivity modeling.** A $9/mo app and a $299/mo app in the same category get the same commission recommendation.
5. **LLM-generated fields are fake.** `outreachAngle` and `whyTheseCreators` look like LLM output but are simple string templates.
6. **No input validation for intelligence.** Category typos silently fall through to "Other".

---

## Phase 2 Architecture

### Two-Track Generation

```
Phase 2 Intelligence Pipeline:
                                    
ProductForm
  ├── Track A: Template Engine (fast, free, offline-capable)
  │     └── Same as Phase 1D but with enhanced sub-category routing
  │
  └── Track B: LLM Engine (rich, slow, costs money)
        ├── System Prompt: Product context + intelligence framework
        ├── User Prompt: "Analyse this product..."
        ├── LLM: gpt-4o-mini (default) or gpt-4o (power tier)
        └── Output: Structured JSON via function calling
```

Track selection:
- `POST /api/products/:id/analyze` with `{ useLLM: false }` → Track A
- `POST /api/products/:id/analyze` with `{ useLLM: true }` → Track B
- Default: Track A (cost-safe default; Track B is opt-in or plan-gated)

---

## Phase 2 Enhancements — Track A (Template Engine)

### 2.1 Sub-Category Routing

Expand from 9 categories to ~40 sub-categories using keyword detection on `description` + `mainBenefit`.

```typescript
// Sub-category keyword map
const SUB_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Productivity.TaskManagement': ['tasks', 'to-do', 'project management', 'kanban', 'asana'],
  'Productivity.TimeTracking': ['time tracking', 'pomodoro', 'hours', 'timesheets'],
  'Productivity.NoteTaking': ['notes', 'markdown', 'wiki', 'knowledge base', 'notion', 'obsidian'],
  'Finance.Investing': ['investing', 'portfolio', 'stocks', 'ETF', 'trading'],
  'Finance.Budgeting': ['budget', 'spending', 'expense', 'savings', 'YNAB'],
  'Finance.Crypto': ['crypto', 'bitcoin', 'blockchain', 'DeFi', 'web3'],
  'Fitness.HomeWorkouts': ['home workout', 'no equipment', 'bodyweight', 'HIIT'],
  'Fitness.Nutrition': ['nutrition', 'calories', 'macros', 'meal planning', 'diet'],
  'Health.MentalHealth': ['meditation', 'mindfulness', 'anxiety', 'stress', 'therapy'],
  'Health.Sleep': ['sleep', 'insomnia', 'circadian', 'sleep tracking'],
  // ... ~30 more sub-categories
};

function detectSubCategory(description: string, mainBenefit: string, category: string): string {
  const text = `${description} ${mainBenefit}`.toLowerCase();
  for (const [subCat, keywords] of Object.entries(SUB_CATEGORY_KEYWORDS)) {
    if (subCat.startsWith(category) && keywords.some(kw => text.includes(kw))) {
      return subCat;
    }
  }
  return category; // Fall back to parent category
}
```

### 2.2 Price Sensitivity Model

Commission attractiveness varies dramatically by price point. A 35% commission on a $9/mo product = $3.15/conversion. On a $99/mo product = $34.65/conversion. These require very different outreach strategies.

```typescript
type PriceTier = 'micro' | 'low' | 'mid' | 'high' | 'premium';

function getPriceTier(priceUsdMonthly: number): PriceTier {
  if (priceUsdMonthly < 10)  return 'micro';   // $0–$9
  if (priceUsdMonthly < 30)  return 'low';     // $10–$29
  if (priceUsdMonthly < 80)  return 'mid';     // $30–$79
  if (priceUsdMonthly < 200) return 'high';    // $80–$199
  return 'premium';                             // $200+
}

interface CommissionStrategy {
  minRecommended: number;
  maxRecommended: number;
  warningThreshold: number;   // commission below this is unattractive for this price
  idealCreatorTiers: CreatorType[];
  dealStructure: string;
}

const COMMISSION_STRATEGY_BY_PRICE: Record<PriceTier, CommissionStrategy> = {
  micro:   { min: 40, max: 50, warning: 40, creators: ['Micro'], deal: 'Flat CPA ($5–10 per signup)' },
  low:     { min: 35, max: 45, warning: 35, creators: ['Micro', 'Mid-Tier'], deal: 'Revenue Share' },
  mid:     { min: 30, max: 40, warning: 25, creators: ['Micro', 'Mid-Tier'], deal: 'Revenue Share or CPA' },
  high:    { min: 25, max: 35, warning: 20, creators: ['Mid-Tier', 'Macro'], deal: 'Rev Share + Minimum Guarantee' },
  premium: { min: 20, max: 30, warning: 15, creators: ['Mid-Tier', 'Macro', 'Celebrity'], deal: 'Flat Fee + CPA Kicker' },
};
```

### 2.3 Commission Attractiveness Signal

```typescript
function getCommissionAttractivenessSignal(
  commissionOffer: number,
  priceUsdMonthly: number
): { signal: 'Below Market' | 'Market Rate' | 'Attractive' | 'Exceptional'; message: string } {
  const earningPerConversion = (priceUsdMonthly * commissionOffer) / 100;
  
  if (earningPerConversion < 5)  return { signal: 'Below Market', message: 'Creators earn under $5/conversion — very hard to motivate active promotion.' };
  if (earningPerConversion < 15) return { signal: 'Market Rate', message: 'Comparable to standard affiliate deals. Will get some takers.' };
  if (earningPerConversion < 40) return { signal: 'Attractive', message: 'Above standard rates — creators will notice and prioritise.' };
  return { signal: 'Exceptional', message: `$${earningPerConversion.toFixed(0)}/conversion — this is a top 5% commission. Expect strong inbound interest.` };
}
```

### 2.4 Competitor Detection

```typescript
const COMPETITOR_SIGNALS: Record<string, string[]> = {
  Productivity: ['notion', 'asana', 'monday.com', 'trello', 'clickup', 'todoist', 'linear'],
  Finance: ['wealthfront', 'betterment', 'robinhood', 'coinbase', 'mint', 'ynab', 'qapital'],
  Fitness: ['myfitnesspal', 'peloton', 'noom', 'calorie king', 'whoop', 'fitbit'],
  Health: ['betterhelp', 'calm', 'headspace', 'oura', 'athletic greens', 'ag1'],
  // ...
};

function detectCompetitorMentions(description: string, category: string): string[] {
  const text = description.toLowerCase();
  const competitors = COMPETITOR_SIGNALS[category] ?? [];
  return competitors.filter(c => text.includes(c));
}
```

If competitors are detected in the description (e.g. "better than Notion"), auto-elevate `competitionLevel` to at least "Competitive" and add a note: "Your description mentions [Notion] — this market is actively contested."

### 2.5 Revenue Projection Improvements

Replace fixed constants with price-tier-aware conversion estimates:

```typescript
const CONVERSION_ESTIMATES_BY_TIER: Record<PriceTier, {
  avgConversionsPerMicroCreator: number;
  avgConversionsPerMidTierCreator: number;
  churnRateMonthly: number;   // used for LTV calculation
}> = {
  micro:   { micro: 80, midTier: 200, churn: 0.12 },
  low:     { micro: 55, midTier: 130, churn: 0.09 },
  mid:     { micro: 35, midTier: 90,  churn: 0.07 },
  high:    { micro: 15, midTier: 45,  churn: 0.05 },
  premium: { micro: 5,  midTier: 20,  churn: 0.03 },
};
```

---

## Phase 2 Enhancements — Track B (LLM Engine)

### System Prompt Architecture

```
SYSTEM:
You are a creator partnership strategist specialising in high-commission affiliate 
and influencer deals (35-40% commission). You analyse products and produce structured 
intelligence reports to guide creator recruitment and outreach.

You always output valid JSON matching the provided schema.
You are specific, actionable, and avoid generic marketing language.
You cite specific creator niches, platforms, and deal structures by name.

CONTEXT:
Product category: {category}
Sub-category detected: {subCategory}
Price tier: {priceTier} (${priceUsdMonthly}/mo)
Commission offered: {commissionOffer}%
Earning per conversion: ${earningPerConversion}
Commission attractiveness: {attractivenessSignal}

USER:
Analyse the following product and return intelligence data:

Name: {name}
Website: {website}
Description: {description}
Category: {category}
Target Customer: {targetCustomer}
Main Benefit: {mainBenefit}
Price: {price}
Commission Offer: {commissionOffer}%

Return ONLY valid JSON matching this exact schema:
{schemaJson}
```

### Function Calling Schema (OpenAI)

Use `response_format: { type: "json_object" }` or a function call schema to ensure structured output:

```typescript
const INTELLIGENCE_FUNCTION_SCHEMA = {
  name: "produce_product_intelligence",
  description: "Analyse a product and return structured creator partnership intelligence",
  parameters: {
    type: "object",
    required: [...all 14+ field names...],
    properties: {
      mainMarket: { type: "string", description: "Market segment, 5–8 words" },
      subMarket: { type: "string", description: "2–4 sub-niches separated by ·" },
      buyerPersona: {
        type: "object",
        properties: {
          age: { type: "string" },
          gender: { type: "string" },
          interests: { type: "array", items: { type: "string" }, maxItems: 5 },
          painPoints: { type: "array", items: { type: "string" }, maxItems: 4 },
          platforms: { type: "array", items: { type: "string", enum: ["YouTube","Instagram","TikTok"] } }
        }
      },
      outreachAngle: { type: "string", description: "2–3 sentences, actionable, specific to this product" },
      whyTheseCreators: { type: "string", description: "2–3 sentences explaining the creator category selection" },
      // ... all other fields with descriptions
    }
  }
};
```

### LLM Cost Controls

| Model | Cost | Use case |
|---|---|---|
| `gpt-4o-mini` | ~$0.003/call | Default. Sufficient for all intelligence fields. |
| `gpt-4o` | ~$0.06/call | Power mode, reserved for pro plan users. |
| Template fallback | $0 | Free plan or LLM timeout fallback. |

**Caching strategy:** Intelligence snapshots are stored in `product_intelligence_snapshots`. The LLM is only called when:
- A new product is created
- User explicitly clicks "Re-Analyse"
- Product description/category changes

Never re-call LLM on every page load.

---

## Phase 2 Output Additions

Beyond the current 14 fields, Phase 2 intelligence adds:

| New Field | Description |
|---|---|
| `subCategory` | Detected sub-niche (e.g. "Productivity.TaskManagement") |
| `priceTier` | micro/low/mid/high/premium |
| `commissionAttractivenessSignal` | Below Market / Market Rate / Attractive / Exceptional |
| `earningPerConversion` | Numeric: `price × commission%` |
| `detectedCompetitors` | Array of competitor names found in description |
| `idealCreatorTiers` | ['Micro', 'Mid-Tier'] — derived from price tier |
| `idealDealStructure` | e.g. "Revenue Share with $500 monthly minimum" |
| `ltv` | Estimated customer lifetime value |
| `confidenceScore` | 0–100: how confident the engine is in its analysis |
| `engineVersion` | '2.0' or '2.0-llm' |

---

## Migration Plan (Phase 1D → Phase 2)

1. **Keep the frontend engine intact.** `productIntelligence.ts` continues to work for the form-based instant analysis. No breaking changes.
2. **Add server-side engine.** Copy and enhance the engine in `artifacts/api-server/src/lib/productIntelligence.ts`.
3. **Add LLM track behind a feature flag.** `ENABLE_LLM_INTELLIGENCE=true` env var gates the LLM path.
4. **Snapshot on save.** When a product is saved via the API, auto-run Track A analysis and store the snapshot. Users can request Track B via "Re-Analyse with AI" button.
5. **Frontend reads from API.** Replace `generateProductIntelligence(formData)` call with `POST /api/products/:id/analyze` response.

---

## Testing Strategy

```
Unit tests (vitest):
  - generateProductIntelligence() → all 9 categories → verify all 14 fields present
  - detectSubCategory() → keyword coverage tests
  - getCommissionAttractivenessSignal() → boundary conditions
  - detectCompetitorMentions() → case-insensitive, partial match

Integration tests:
  - POST /api/products/:id/analyze (Track A) → full snapshot stored in DB
  - POST /api/products/:id/analyze (Track B) → LLM called, response validated against schema

Regression tests:
  - Store golden snapshots for all 3 mock products
  - On engine version bump, diff output against golden snapshots
  - Any field regression requires manual review before deploy
```
