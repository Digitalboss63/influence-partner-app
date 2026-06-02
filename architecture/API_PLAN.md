# API Plan — Influence Partner App

**Last Updated:** 2026-06-02  
**Base URL:** `http://localhost:3001` (dev) | `TBD` (prod)  
**Namespace:** `/api`

---

## Design Principles

- RESTful, resource-oriented routes
- All responses wrapped in `{ data: T, count?: number }`
- All errors return `{ error: string, detail?: string }`
- HTTP status codes used correctly (200, 201, 400, 404, 500, 503)
- Input validated with Zod on all write endpoints
- No auth in Phase 2A — all endpoints are open

---

## Phase 2A — Implemented Routes

### Health

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/healthz` | Server + DB health status | None |

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-06-02T23:04:19.356Z",
  "uptime": 22,
  "services": {
    "database": { "status": "ok" }
  }
}
```

---

### Products — `/api/products`

| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product (partial OK) |
| DELETE | `/api/products/:id` | Delete product |

**POST/PUT body:**
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "category": "string (required)",
  "price": "number (required, > 0)",
  "url": "url string | null",
  "imageUrl": "url string | null",
  "targetAudience": "string | null",
  "keyBenefits": ["string array | null"]
}
```

---

### Creators — `/api/creators`

| Method | Route | Description |
|---|---|---|
| GET | `/api/creators` | List all creators (optional filters) |
| GET | `/api/creators/:id` | Get single creator |
| POST | `/api/creators` | Create creator |
| PUT | `/api/creators/:id` | Update creator (partial OK) |
| DELETE | `/api/creators/:id` | Delete creator |

**GET query filters:**
- `?platform=instagram|youtube|tiktok|twitter|other`
- `?niche=skincare` (substring match)
- `?minFollowers=50000`
- `?maxFollowers=500000`

**POST/PUT body:**
```json
{
  "name": "string (required)",
  "handle": "string (required)",
  "platform": "instagram|youtube|tiktok|twitter|other (required)",
  "niche": "string (required)",
  "followerCount": "integer",
  "engagementRate": "float",
  "avgViews": "integer | null",
  "avgLikes": "integer | null",
  "location": "string | null",
  "email": "email string | null",
  "bio": "string | null",
  "tags": ["string array | null"],
  "audienceDemographics": { "object | null" },
  "priceRange": "string | null",
  "isVerified": "boolean"
}
```

---

### Pipeline — `/api/pipeline`

| Method | Route | Description |
|---|---|---|
| GET | `/api/pipeline` | List pipeline items (optional filters) |
| GET | `/api/pipeline/:id` | Get single pipeline item |
| POST | `/api/pipeline` | Create pipeline item |
| PUT | `/api/pipeline/:id` | Update pipeline item |
| DELETE | `/api/pipeline/:id` | Delete pipeline item |
| GET | `/api/pipeline/:id/messages` | Get messages for pipeline item |
| POST | `/api/pipeline/:id/messages` | Add message to pipeline item |
| GET | `/api/pipeline/messages/all` | Get all outreach messages |

**Pipeline status values:**
`New` | `Contacted` | `Interested` | `Negotiating` | `Active` | `Rejected`

**GET query filters:**
- `?productId=prod_001`
- `?creatorId=cre_001`
- `?status=Active`

---

## Planned Routes (Phase 2B+)

| Route | Phase | Description |
|---|---|---|
| `GET /api/products/:id/intelligence` | 2B | Get intelligence snapshot for product |
| `POST /api/products/:id/intelligence/refresh` | 2B | Trigger LLM analysis |
| `GET /api/creators/:id/scores` | 2B | Get all product scores for a creator |
| `GET /api/products/:id/scores` | 2B | Get all creator scores for a product |
| `POST /api/products/:id/scores/compute` | 2B | Trigger score recomputation |
| `POST /api/auth/register` | 3 | User registration |
| `POST /api/auth/login` | 3 | User login |
| `GET /api/me` | 3 | Current user profile |
| `GET /api/discover` | 3 | Paginated creator discovery with scoring |
| `POST /api/outreach/generate` | 2B | LLM-generated outreach message |
| `GET /api/analytics/pipeline` | 3+ | Pipeline funnel analytics |

---

## Error Format

All errors return:
```json
{
  "error": "Human-readable message",
  "detail": "Technical detail (dev only)",
  "details": [{ "path": "field.name", "message": "Validation message" }]
}
```

## Rate Limiting (Planned — Phase 2B)

```
# TODO: Add express-rate-limit for LLM-backed endpoints
# Target limits:
#   POST /api/products/:id/intelligence/refresh → 10 req/min per IP
#   POST /api/outreach/generate → 20 req/min per IP
```
