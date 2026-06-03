# Phase 2 Technical Review — Influence Partner App

**Reviewed:** 2026-06-02  
**Reviewer:** Architecture Review  
**Scope:** Full frontend codebase audit + Phase 2 backend implementation plan

---

## 1. Codebase Structure Assessment

### Current State (Phase 1D)

```
artifacts/influence-partner/src/
├── context/
│   └── AppContext.tsx          ← Global state + localStorage persistence
├── data/
│   ├── mockCreators.ts         ← 15 hardcoded creators, auto-scored at import
│   └── mockProducts.ts         ← 3 pre-enriched products via intelligence engine
├── lib/
│   ├── productIntelligence.ts  ← 9-category lookup + revenue estimation
│   ├── scoring.ts              ← Fit score (0–100), conflict/gap levels
│   ├── outreachTemplates.ts    ← Template-based message generator
│   └── utils/format.ts         ← Display helpers
├── pages/
│   ├── Dashboard.tsx           ← Revenue projection, recommended action, workflow
│   ├── ProductIntake.tsx       ← Form + full-width intelligence report
│   ├── CreatorDiscovery.tsx    ← Filtered grid, opportunity scoring
│   ├── CreatorDetail.tsx       ← Individual creator full profile
│   ├── OutreachGenerator.tsx   ← Channel/tone/creator/product message builder
│   └── CRMPipeline.tsx         ← Drag-and-drop kanban board
├── types/
│   └── influencePartner.ts     ← All domain types (Creator, Product, etc.)
└── components/
    ├── ProductIntelligenceSummary.tsx  ← 14-section report + Dashboard preview
    └── HoverHelp.tsx                  ← Tooltip glossary system
```

### Structural Strengths
- **Type system is solid.** `influencePartner.ts` covers all domain entities cleanly. Minimal type duplication.
- **Scoring engine is clean and portable.** `scoring.ts` is pure functions — zero side effects. Trivially moveable to a backend lib.
- **Intelligence engine is deterministic.** Category-keyed lookup + price parsing means results are reproducible given the same input. Easy to unit test.
- **AppContext is the right pattern now.** `localStorage` persistence is appropriate for the current stage. The shape of the context maps well to future API calls.
- **UI component coverage is complete.** All shadcn/ui primitives are installed and in use. No need to add UI packages in Phase 2.

### Structural Weaknesses (must address in Phase 2)
- **Creators are not linked to products.** Fit scores are static, not computed against the active product. All 15 creators have the same scores regardless of which product is selected.
- **No user/account concept.** Everything is single-tenant. Multi-product SaaS needs user identity from day one.
- **Intelligence engine is category-only.** 9 categories with hardcoded lookup tables. Phase 2 needs input-driven personalisation (description NLP, price sensitivity, audience signals).
- **Outreach generation is template-literal.** No variation beyond 3 P.S. tweaks. Real value requires LLM-backed generation.
- **No audit trail.** Pipeline stage changes are silent. No timestamps, no history, no notes.
- **Revenue projection uses fixed constants.** `avgMonthlyConversions = 45`, `partnersEstimate = 8` are hardcoded. Needs real conversion data or at minimum user-configurable assumptions.
- **localStorage has no conflict resolution.** Two browser tabs will diverge. Phase 2 needs server-authoritative state.

---

## 2. Data Model Requirements

### Core Entities (Phase 2)

**Users** — Multi-tenant SaaS. Every entity is scoped to a user.

**Products** — Currently flat. Phase 2 needs:
- Versioned intelligence (re-analysis should produce a new snapshot, not overwrite)
- Status field: `draft | active | archived`
- Linked campaigns (one product → many campaigns)

**Creators** — Currently global/static. Phase 2 needs:
- Per-product fit scores (a creator may score 90 for a productivity tool, 45 for a finance app)
- Source tracking: manually added vs. discovered vs. imported
- Contact history linkage
- Platform-specific metadata (subscriber growth rate, avg views/post, sponsorship frequency)

**Pipeline Entries** — Currently `creator.pipelineStage` is a single field. Phase 2 needs:
- A `pipeline_entries` join table: `creator_id + product_id + stage`
- Timestamps for each stage transition
- Notes/comments per entry
- Deal terms snapshot at signing

**Outreach Messages** — Currently ephemeral (not persisted). Phase 2 needs:
- Saved messages linked to creator + product + campaign
- Status: `draft | sent | replied | ignored`
- Send timestamp

**Campaigns** — Not modelled yet. Phase 2 needs:
- A Campaign as the unit of work: `product_id + target_creator_categories + date_range + budget`
- Links creators to products via the pipeline

### Full schema details → `architecture/DATABASE_SCHEMA.md`

---

## 3. Product Intelligence Engine Requirements

### Current Implementation
- **Input:** 8 fields (name, website, description, category, targetCustomer, mainBenefit, price, commissionOffer)
- **Processing:** Category key lookup → fixed template hydration with price-based revenue math
- **Output:** 14 fields covering market, buyer persona, creator categories, platforms, commission, outreach angle, competition, revenue

### Phase 2 Requirements
- **Description analysis:** Parse `description` and `mainBenefit` for keywords. Map to sub-niches beyond the 9 top-level categories (e.g. "meditation app" under Health → Mindfulness sub-niche).
- **Price sensitivity scoring:** Commission attractiveness varies by product price. A $9/mo product needs 40%+ to be compelling; a $299/mo product is compelling at 25%. The engine should flag commission/price mismatches.
- **Competitor signal detection:** Simple keyword matching against known competitor names (Notion, Asana, Robinhood, etc.) from description text to adjust competition level automatically.
- **Commission recommendation tuning:** Should factor in product price, category saturation, and target creator tier (micro vs. macro require different structures).
- **LLM-backed narrative fields:** `outreachAngle`, `whyTheseCreators`, `buyerPersona.interests` are currently hardcoded strings. Phase 2 should generate these via a streaming LLM call (OpenAI/Anthropic) with the product form as context.

### Full engine spec → `architecture/INTELLIGENCE_ENGINE.md`

---

## 4. Creator Scoring Engine Requirements

### Current Implementation
```
fitScore = audienceMatch*0.30 + engScore*0.20 + platformFit*0.15 + productFit*0.20 + (100-conflict)*0.15
```
All input dimensions are **manually hardcoded per creator**. There is no dynamic scoring against the active product.

### Phase 2 Requirements
- **Product-relative scoring:** `audienceMatch` and `productFit` must be computed against `activeProduct.buyerPersona` and `activeProduct.recommendedCreatorCategories`.
- **Niche overlap scoring:** Given a creator's `niche` and the product's `recommendedCreatorCategories`, compute a match score based on category proximity.
- **Platform fit scoring:** Dynamic — if the product's `recommendedPlatforms` includes YouTube and the creator is on YouTube, score 100; Instagram = 60 if not recommended, etc.
- **Conflict engine:** When Phase 2 includes creator profile scraping/import, scan for sponsor mentions to auto-populate `competitiveConflict`.
- **Engagement quality signal:** Currently a single `engagementRate` float. Phase 2 should distinguish views-to-comments ratio (comment-heavy = buying intent) vs. pure view count.

---

## 5. Opportunity / Sponsor Conflict Engine

### Current Implementation
```typescript
getOpportunityLevel(fitScore, competitiveConflict)
getSponsorConflictLevel(competitiveConflict) // 0–100 integer
```

### Phase 2 Requirements
- **Multi-dimensional opportunity score:** Current score is binary (fit + conflict). Phase 2 needs: `(audienceSize × engagementRate × audienceMatch × (1 - conflict) × commissionAttractiveness)`
- **Exclusivity window detection:** Track whether a competitor's deal has ended (recency matters). A creator who last promoted a competitor 18 months ago is a better prospect than 3 months ago.
- **Sponsorship frequency signal:** Creators who promote 8+ brands/month are over-saturated. Score them down for partner fit (as opposed to one-off sponsor fit).
- **Deal structure recommendation engine:** Based on opportunity level + follower count + engagement rate, recommend: Revenue Share vs. CPA vs. Flat Fee vs. Hybrid.

---

## 6. Outreach Generation Logic

### Current Implementation
Template-literal function in `outreachTemplates.ts`. Interpolates creator/product fields. 4 tone variants × 4 channel variants = 16 combinations. Deterministic — same inputs = same output (plus 3 random P.S. tweaks on regenerate).

### Phase 2 Requirements
- **LLM generation (primary path):** Replace template literals with an LLM call. System prompt = product intelligence + creator profile + channel constraints. User prompt = "Write an outreach [email/DM] in [tone] for this creator."
- **Template fallback (offline/free tier):** Keep current template system as a non-LLM fallback.
- **Personalisation signals:** Include creator's recent content titles (from discovery data) in the LLM context. "I loved your recent video on X" needs to be real.
- **Subject line variants:** A/B testable. Generate 3 subject lines per email. Track open rates in Phase 3.
- **Message persistence:** Save generated messages to `outreach_messages` table with creator + product + channel + tone metadata.
- **Send status tracking:** `draft → sent → replied → ignored`. Linked to pipeline stage changes.

---

## 7. CRM Pipeline Persistence

### Current State
- `pipelineStage` is a string field on `Creator`
- State stored in `localStorage.ip_creators`
- `updateCreatorStage(creatorId, stage)` replaces the field in-place
- No timestamps, no history, no notes, no per-product tracking

### Phase 2 Requirements
- **Pipeline is per product, not per creator.** A creator can be in "Negotiating" for Product A and "New" for Product B simultaneously.
- **Stage history table:** Every transition should record `{creator_id, product_id, from_stage, to_stage, changed_at, changed_by, note}`.
- **Notes per pipeline entry:** Free-text notes attached to each creator-product relationship (e.g., "emailed on 2026-06-01, awaiting reply").
- **Deal terms at activation:** When moving to "Active", capture `{commission_pct, deal_type, deal_start_date, deal_end_date, monthly_minimum_guarantee}`.
- **Activity feed:** Ordered list of all pipeline events for a product campaign. Used by the Dashboard.

---

## 8. Active Product State Management

### Current State
```typescript
selectedProductId: string | null  // localStorage.ip_selected_product
```
All pages read from `AppContext`. The active product drives the Dashboard intelligence card and the Product Intake report mode.

### Phase 2 Requirements
- **Server-authoritative selected product:** Move `selectedProductId` to the user's session/profile. Persists across devices.
- **Product context propagation:** When navigating to Creator Discovery, Outreach Generator, or Pipeline — the active product should auto-filter and score. Currently these pages don't consume `selectedProductId`.
- **Product switching UX:** A persistent product switcher in the header/sidebar. Currently only on the Product Intelligence Report page.
- **Campaign context vs. product context:** In Phase 2, the active unit becomes a Campaign (product + date range + targets), not just a Product.

---

## 9. Future YouTube / Instagram / TikTok Discovery Strategy

See full strategy document → `architecture/CREATOR_DISCOVERY_STRATEGY.md`

**Summary:**
- Phase 2.0: Manual import + CSV upload (no API needed)
- Phase 2.1: YouTube Data API v3 for channel search by keyword + category
- Phase 2.2: Instagram Basic Display API (limited, requires user auth) + scrape proxy fallback
- Phase 2.3: TikTok Research API (application-gated, needs business account)
- Phase 2.4+: Third-party data providers (Modash, Heepsy, Phyllo) via webhook/API

---

## 10. Security / Environment Variable Requirements

### Required in Phase 2
```
# Database
DATABASE_URL=postgresql://...

# Authentication
SESSION_SECRET=<already set>

# LLM (for Intelligence Engine + Outreach)
OPENAI_API_KEY=sk-...          ← or ANTHROPIC_API_KEY
LLM_MODEL=gpt-4o-mini          ← cost/quality tradeoff config

# Platform APIs (Phase 2.1+)
YOUTUBE_DATA_API_KEY=...
# INSTAGRAM_APP_ID + INSTAGRAM_APP_SECRET (Phase 2.2)
# TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET (Phase 2.3)

# App config
NODE_ENV=production
ALLOWED_ORIGINS=https://...replit.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Security Principles
- All API keys in environment secrets — never in code or `.env` files committed to repo
- LLM endpoint proxied through Express API — never call OpenAI directly from the browser
- All DB queries parameterised via Drizzle ORM — no raw SQL string interpolation
- Rate limiting on all API routes, especially LLM endpoints (cost exposure risk)
- Input sanitisation on all user-supplied text that enters LLM prompts (prompt injection risk)

---

## 11. Database Schema

Full schema → `architecture/DATABASE_SCHEMA.md`

**Table summary:**
| Table | Purpose |
|---|---|
| `users` | Authentication + account |
| `products` | Product definitions |
| `product_intelligence_snapshots` | Versioned intelligence results |
| `creators` | Creator profiles |
| `creator_scores` | Per-product fit scores (computed) |
| `pipeline_entries` | Creator-product-stage with history |
| `pipeline_events` | Full audit trail of stage changes |
| `campaigns` | Campaign definitions per product |
| `outreach_messages` | Saved + sent outreach with status |
| `deal_terms` | Signed deal terms per active partnership |

---

## 12. API Route Plan

Full route list → `architecture/API_PLAN.md`

**Route groups:**
- `/api/auth` — session, login, logout
- `/api/products` — CRUD + intelligence generation
- `/api/creators` — CRUD + search + import
- `/api/scoring` — compute fit scores per product
- `/api/pipeline` — stage management + history
- `/api/outreach` — generate + save + track messages
- `/api/campaigns` — campaign management
- `/api/dashboard` — aggregated metrics endpoint
- `/api/discovery` — platform search (Phase 2.1+)

---

## 13. Recommended Phase 2 Build Order

### Sprint 1 — Backend Foundation (no new UI features)
1. Set up Express API server (already scaffolded in `artifacts/api-server`)
2. PostgreSQL + Drizzle schema: users, products, creators, pipeline_entries
3. Session-based auth (SESSION_SECRET already set)
4. CRUD API for products and creators
5. Migrate frontend from localStorage to API calls via React Query hooks (already installed)

### Sprint 2 — Dynamic Scoring + Intelligence
6. Move scoring engine to server — compute fit scores per product dynamically
7. Add `product_intelligence_snapshots` table + versioned re-analysis endpoint
8. LLM-backed intelligence fields (outreach angle, why these creators, buyer persona narrative)
9. Update Creator Discovery to filter/sort by active product's intelligence data

### Sprint 3 — Outreach + Pipeline Persistence
10. Persist outreach messages to DB, link to creator + product
11. Pipeline event history table — every stage change gets a record
12. Deal terms capture when creator moves to "Active"
13. Notes/comments on pipeline entries

### Sprint 4 — Discovery Integration
14. Manual creator import via CSV or URL paste
15. YouTube Data API search by keyword/category
16. Creator enrichment endpoint (fetch public stats, recent content)

### Sprint 5 — Analytics + Polish
17. Real conversion tracking (webhook from product's payment system)
18. Dashboard metrics from DB, not estimated constants
19. Multi-user / team accounts
20. Email notification on pipeline stage changes

---

## Main Risks

| Risk | Severity | Mitigation |
|---|---|---|
| LLM cost runaway | High | Rate limit per user per day; cache intelligence snapshots; use gpt-4o-mini not gpt-4o |
| Platform API access denied | High | Start with YouTube (most permissive); build CSV import fallback first |
| Creator data accuracy | Medium | Display confidence levels; let users override scores manually |
| localStorage migration friction | Medium | Build a one-time migration endpoint; preserve mock data as defaults for new users |
| Prompt injection via product description | Medium | Sanitise user inputs before inserting into LLM prompts; use system/user role separation |
| Multi-tab state diverge | Low (Phase 2) | Server-authoritative state solves this; React Query cache invalidation |
| Pipeline stage data loss on reload | Low (Phase 2) | Already mitigated by localStorage; eliminated in Phase 2 with DB persistence |
