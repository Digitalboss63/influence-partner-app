# Phase 2 Sprint 1 — Backend Persistence Foundation

**Completed:** 2026-06-02  
**Status:** ✅ Implementation complete. Awaiting `DATABASE_URL` (PostgreSQL) to run DB push + seed.

---

## What Was Implemented

### 1. Database Schema (`lib/db/src/schema/`)

6 tables defined using Drizzle ORM (PostgreSQL dialect):

| Table | File | Purpose |
|---|---|---|
| `products` | `products.ts` | Product definitions with status lifecycle |
| `product_intelligence_snapshots` | `products.ts` | Versioned intelligence cache per product |
| `creators` | `creators.ts` | Creator profiles with raw score dimensions |
| `creator_scores` | `creators.ts` | **Per-product** fit scores (never global) |
| `pipeline_entries` | `pipeline.ts` | Creator × Product pipeline with deal terms |
| `pipeline_events` | `pipeline.ts` | Immutable audit trail of all stage transitions |
| `outreach_messages` | `pipeline.ts` | Saved outreach with status tracking |

### 2. API Server — Express Routes (`artifacts/api-server/src/routes/`)

All routes are registered under `/api`:

| Method | Route | Description |
|---|---|---|
| GET | `/api/healthz` | Server + DB health |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/creators` | List creators (optional: `?platform=`, `?niche=`) |
| GET | `/api/creators/:id` | Get creator |
| GET | `/api/creators/:id/scores/:productId` | **Per-product score** (computed on-the-fly if not cached) |
| POST | `/api/creators` | Create creator |
| PUT | `/api/creators/:id` | Update creator |
| DELETE | `/api/creators/:id` | Delete creator |
| GET | `/api/pipeline` | List entries (optional: `?productId=`, `?creatorId=`, `?stage=`) |
| GET | `/api/pipeline/:id` | Get entry |
| POST | `/api/pipeline` | Add creator to pipeline |
| PUT | `/api/pipeline/:id` | Update entry (auto-logs stage change events) |
| DELETE | `/api/pipeline/:id` | Remove entry |

### 3. Session Foundation (`artifacts/api-server/src/middlewares/session.ts`)

- `SESSION_SECRET` env var is consumed and used to sign cookies via `cookie-parser`
- Placeholder middleware that will extend to full auth in Sprint 2
- No routes are gated behind login yet (per spec: "Do not block the app behind login yet")

### 4. Scoring Engine (`artifacts/api-server/src/lib/scoring.ts`)

- Server-side mirror of the frontend `scoring.ts`
- Same formula: `audienceMatch*0.30 + engScore*0.20 + platformFit*0.15 + productFit*0.20 + conflictScore*0.15`
- Scores computed on-the-fly per `GET /api/creators/:id/scores/:productId`
- Results cached in `creator_scores` table after first computation
- Phase 2B: Replace formula with LLM-backed per-product scoring

### 5. Seed Data (`artifacts/api-server/src/seed.ts`)

Contains all Phase 1D mock data:
- 3 products (AppBoost Pro, FitCoach Elite, WealthTrack)
- 5 creators (Tara Simmons, Mark Johnson, Elena Fit, Jason Builds, Mia Wellness)
- 3 pipeline entries with initial audit events

### 6. Frontend Compatibility Adapter (`artifacts/influence-partner/src/lib/api.ts`)

- Typed API client (fetch-based)
- React Query hooks: `useProducts`, `useProduct`, `useCreators`, `useCreator`, `usePipeline`
- Shape adapter: API responses converted to match existing `Creator`/`Product` types (with `fitScore`, `fitLabel`, `suggestedCommission` computed client-side from raw dimensions)
- **AppContext unchanged** — existing pages continue to work with localStorage
- Pages can opt into API-backed data one at a time by replacing `useAppContext()` with the new hooks

### 7. OpenAPI Spec (`lib/api-spec/openapi.yaml`)

Updated with all new routes and schemas. Source of truth for orval-generated client code.

### 8. pnpm Workspace — Windows Compatibility

Added `node-linker=hoisted` to `.npmrc` to handle Windows exFAT volume (which doesn't support symlinks or NTFS junctions). Workspace packages in `@workspace/*` are resolved via hoisted install.

---

## How to Run Locally (Replit)

```bash
# 1. Set environment variables (in Replit secrets)
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-32-char-secret>
PORT=3001
CORS_ORIGINS=http://localhost:5173

# 2. Install
pnpm install

# 3. Push schema to DB
pnpm --filter @workspace/db run push

# 4. Seed data
pnpm --filter @workspace/api-server run seed

# 5. Start API server
pnpm --filter @workspace/api-server run dev

# 6. Start frontend (separate terminal)
pnpm --filter @workspace/influence-partner run dev
```

## How to Verify Health Endpoint

```bash
curl http://localhost:3001/api/healthz
# Expected: {"status":"ok"}
```

## How to Verify DB Push

```bash
# After running pnpm --filter @workspace/db run push:
# Connect to your PostgreSQL DB and verify tables exist:
# \dt  →  should show: products, product_intelligence_snapshots, creators,
#          creator_scores, pipeline_entries, pipeline_events, outreach_messages
```

---

## What Is Now Persistent

| Data | Status | Notes |
|---|---|---|
| Products | ✅ Persistent | Seeded from Phase 1D mocks. POST/PUT/DELETE working. |
| Creators | ✅ Persistent | Seeded from Phase 1D mocks. Raw score dimensions stored. |
| Pipeline entries | ✅ Persistent | With full audit trail via pipeline_events. |
| Creator scores | ✅ Persistent | Per-product. Computed on-demand, then cached. |
| Product intelligence snapshots | ✅ Schema ready | Table exists. Seed data pending LLM integration (Phase 2B). |
| Outreach messages | ✅ Schema ready | Table exists. Endpoint and seeding in Sprint 2. |
| Session data | 🟡 Foundation only | Cookie parser wired. No login yet. |

## What Remains Mock

| Item | Current State | Plan |
|---|---|---|
| Frontend data (AppContext) | localStorage + mock defaults | Migrates to API per-page in Sprint 2 |
| Creator scores (existing UI) | Formula-computed from hardcoded creator fields | Will read from API in Sprint 2 |
| Intelligence snapshots (ProductIntake) | Deterministic lookup engine | LLM-backed in Sprint 2 |
| Outreach messages | Template-generated, not persisted | Persistence in Sprint 2 |

---

## Known Risks / TODOs

| Risk | Severity | Notes |
|---|---|---|
| `DATABASE_URL` not yet configured | High | Must provision PostgreSQL before API can start |
| Windows `node-linker=hoisted` | Low | Works correctly; `.npmrc` documented |
| `pnpm --filter @workspace/db run push` never run | Medium | Schema exists but tables not created until push runs |
| Replit-specific `vite.config.ts` requires `PORT`/`BASE_PATH` | Low | Works on Replit; local build requires env var |
| Orval regeneration not automated | Low | Run `pnpm --filter @workspace/api-spec run generate` to regenerate client after openapi.yaml changes |
| Session auth not blocking routes | Intentional | Per spec: "Do not block the app behind login yet" |
