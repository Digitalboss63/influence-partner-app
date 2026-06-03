# API Plan — Influence Partner App

**Last Updated:** 2026-06-02  
**Spec file:** `lib/api-spec/openapi.yaml`  
**Client generation:** orval → `lib/api-client-react/` and `lib/api-zod/`

---

## Base URL

| Environment | URL |
|---|---|
| Local / Replit | `http://localhost:<PORT>/api` |
| Production | `https://<app-domain>/api` |

---

## Phase 2 Sprint 1 — Implemented Routes

### Health

| Method | Route | Description |
|---|---|---|
| GET | `/api/healthz` | Server health. Returns `{"status":"ok"}` |

---

### Products

| Method | Route | Body / Params | Description |
|---|---|---|---|
| GET | `/api/products` | — | List all products |
| GET | `/api/products/:id` | — | Get single product |
| POST | `/api/products` | `CreateProductInput` | Create product |
| PUT | `/api/products/:id` | `UpdateProductInput` (partial) | Update product |
| DELETE | `/api/products/:id` | — | Delete product (cascades to snapshots, scores, pipeline) |

---

### Creators

| Method | Route | Body / Params | Description |
|---|---|---|---|
| GET | `/api/creators` | `?platform=`, `?niche=` | List creators with optional filters |
| GET | `/api/creators/:id` | — | Get single creator |
| GET | `/api/creators/:id/scores/:productId` | — | **Per-product fit score** — computed on-demand, then cached |
| POST | `/api/creators` | `CreateCreatorInput` | Create creator |
| PUT | `/api/creators/:id` | `UpdateCreatorInput` (partial) | Update creator |
| DELETE | `/api/creators/:id` | — | Delete creator |

#### Per-Product Scoring Behavior
- First call: computes score using formula, stores in `creator_scores` table, returns result
- Subsequent calls: returns cached score from DB
- To force recompute: DELETE the score row (future endpoint)
- Formula: `fitScore = audienceMatch*0.30 + engScore*0.20 + platformFit*0.15 + productFit*0.20 + conflictScore*0.15`

---

### Pipeline

| Method | Route | Body / Params | Description |
|---|---|---|---|
| GET | `/api/pipeline` | `?productId=`, `?creatorId=`, `?stage=` | List entries |
| GET | `/api/pipeline/:id` | — | Get single entry |
| POST | `/api/pipeline` | `CreatePipelineEntryInput` | Add creator to pipeline (also logs initial event) |
| PUT | `/api/pipeline/:id` | `UpdatePipelineEntryInput` | Update entry; stage changes auto-logged to `pipeline_events` |
| DELETE | `/api/pipeline/:id` | — | Remove entry (cascades to events and messages) |

#### Pipeline Stage Transitions
When `stage` changes on PUT, a row is written to `pipeline_events`:
```json
{ "fromStage": "New", "toStage": "Contacted", "note": "...", "changedAt": "..." }
```

---

## Response Format

All successful responses:
```json
{ "data": <T> }               // single resource
{ "data": [<T>], "count": N } // list
{ "success": true, "deleted": "<id>" } // delete
```

All errors:
```json
{ "error": "Human-readable message" }
{ "error": "Validation failed", "details": [{"path": "field", "message": "..."}] }
```

---

## Planned Routes (Phase 2B+)

| Route | Phase | Description |
|---|---|---|
| `POST /api/auth/register` | 2B | User registration |
| `POST /api/auth/login` | 2B | Session login |
| `POST /api/auth/logout` | 2B | Session logout |
| `GET /api/products/:id/intelligence` | 2B | Get latest intelligence snapshot |
| `POST /api/products/:id/intelligence/refresh` | 2B | Trigger LLM re-analysis |
| `POST /api/creators/:id/scores/:productId/refresh` | 2B | Force score recomputation |
| `GET /api/pipeline/:id/events` | 2B | Full stage history for an entry |
| `POST /api/pipeline/:id/messages` | 2B | Save outreach message |
| `GET /api/pipeline/:id/messages` | 2B | List messages for a pipeline entry |
| `POST /api/outreach/generate` | 2B | LLM-generated outreach (proxied from frontend) |
| `GET /api/dashboard` | 3 | Aggregated metrics (active deals, pipeline funnel) |
| `GET /api/discovery/youtube` | 3 | YouTube creator search by keyword |

---

## Rate Limiting (Planned — Phase 2B)

```
# LLM-backed endpoints need per-user rate limits to control cost:
# POST /api/products/:id/intelligence/refresh → 5 req/user/day
# POST /api/outreach/generate                → 20 req/user/day
# GET  /api/creators/:id/scores/:productId   → no limit (formula, low cost)
```

---

## Security

| Concern | Status | Plan |
|---|---|---|
| Auth | 🟡 Foundation only | Session secret configured; login in Sprint 2 |
| CORS | ✅ | Restricted to `CORS_ORIGINS` env var |
| Input validation | ✅ | Zod schemas on all write endpoints |
| SQL injection | ✅ | Drizzle ORM — parameterized queries only |
| Secrets in code | ✅ | All via env vars |
| Rate limiting | ⬜ Not yet | Required before LLM endpoints go live |
