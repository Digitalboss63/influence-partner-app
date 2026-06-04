# Phase 3C — Partner Target Management

## Overview

Bridges the gap between **Partner Strategy** and actual recruiting. Partners now move through a proper CRM lifecycle:

```
Product → Partner Strategy → Actual Target → Outreach → Pipeline
```

---

## Database

### New Enum: `partner_target_status`

Values (in order of sales progression):
1. `Not Contacted`
2. `Contacted`
3. `Replied`
4. `Meeting Scheduled`
5. `Negotiating`
6. `Active Partner`
7. `Rejected`

### New Table: `partner_targets`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `product_id` | `uuid` FK → `products.id` | Cascade delete |
| `partner_category` | `text` | e.g. "Course Creator" |
| `name` | `text` | Required |
| `company` | `text` | Optional |
| `platform` | `text` | Free-text — YouTube, Podcast, Blog, etc. |
| `website` | `text` | Optional |
| `email` | `text` | Optional |
| `phone` | `text` | Optional |
| `social_url` | `text` | Optional |
| `notes` | `text` | Optional |
| `status` | `partner_target_status` | Default: "Not Contacted" |
| `user_id` | `text` | Nullable — for future auth |
| `organization_id` | `text` | Nullable — for future multi-tenant |
| `created_at` | `timestamp` | Auto |
| `updated_at` | `timestamp` | Auto |

### Future SaaS Considerations

- `user_id` and `organization_id` are already in the schema, ready for auth.
- When auth is added: add FK constraint `user_id → users.id`.
- Multi-tenant row-level security: `WHERE organization_id = current_org()`.
- No auth is built yet — fields default to `null`.

---

## API Routes

Base path: `/api/targets` (served from `/api` via proxy)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/targets` | List all targets |
| `GET` | `/api/targets?productId=` | Filter by product |
| `GET` | `/api/targets?status=` | Filter by status |
| `GET` | `/api/targets?partnerCategory=` | Filter by category |
| `POST` | `/api/targets` | Create a target |
| `GET` | `/api/targets/:id` | Get a single target |
| `PUT` | `/api/targets/:id` | Update a target (partial) |
| `DELETE` | `/api/targets/:id` | Delete a target |

### POST /api/targets — body

```json
{
  "productId": "uuid",
  "partnerCategory": "Course Creator",
  "name": "John Smith",
  "company": "Optional",
  "platform": "YouTube",
  "website": "https://...",
  "email": "john@example.com",
  "phone": "+1 555 000 1234",
  "socialUrl": "https://youtube.com/@john",
  "notes": "Has 50k subs in productivity niche",
  "status": "Not Contacted"
}
```

Validation: Zod via `insertPartnerTargetSchema` (drizzle-zod). Returns 400 on invalid input.

---

## React Query Integration

### Frontend API Client (`src/lib/api-client.ts`)

```ts
getTargets(params?)          // GET /targets with optional filters
createTarget(payload)        // POST /targets
updateTarget(id, payload)    // PUT /targets/:id
deleteTarget(id)             // DELETE /targets/:id
```

### In PartnerTargets.tsx

```ts
// Query
const { data: targets = [], isLoading } = useQuery({
  queryKey: ['targets'],
  queryFn: () => getTargets(),
});

// Mutations — all invalidate ['targets'] on success
const createMutation = useMutation({ mutationFn: createTarget, ... });
const updateMutation = useMutation({ mutationFn: ({ id, payload }) => updateTarget(id, payload), ... });
const deleteMutation = useMutation({ mutationFn: deleteTarget, ... });
```

### In Dashboard.tsx

```ts
const { data: targets = [] } = useQuery({
  queryKey: ['targets'],
  queryFn: () => getTargets(),
});
```

Both components share the same `['targets']` query key, so a create/update/delete in Targets invalidates and refreshes the Dashboard summary automatically.

---

## New Page: `/targets`

**Navigation position:** Dashboard → Products → Discover Creators → Partner Strategy → **Targets** → Outreach → Pipeline

### Features

1. **Stats bar** — Total / Contacted (Contacted+Replied) / Meetings / Negotiating / Active Partners
2. **Filter bar** — search by name/company, filter by status, filter by product
3. **Target cards** — name, company, partner category, product, status badge, email/phone/website/social links, notes preview
4. **Actions per card:**
   - **Edit** — opens pre-filled Add/Edit dialog
   - **Outreach** — generates outreach URL with `targetName` param, navigates to `/partner-outreach`
   - **Move** — dropdown to change status (optimistic toast)
   - **Delete** — trash icon (immediate, with toast)
5. **Add Target dialog** — Name, Company, Platform, Website, Email, Phone, Social URL, Partner Category (dropdown), Product (dropdown), Notes, Status

---

## Dashboard Integration

A **Partner Targets** summary card appears once there is at least one target. Shows:

| Stat | Logic |
|---|---|
| Total | `targets.length` |
| Contacted | `status ∈ {Contacted, Replied}` |
| Meetings | `status = Meeting Scheduled` |
| Negotiating | `status = Negotiating` |
| Active | `status = Active Partner` |

Clicking any stat navigates to `/targets`. "View Targets →" link in the card header.

---

## Outreach Integration

### From PartnerTargets → PartnerOutreachPlan

When "Outreach" is clicked on a target card:

```ts
const params = new URLSearchParams({
  partnerType: target.partnerCategory,
  commission: `${product.commissionOffer}%`,
  outreachAngle: product.mainBenefit,
  tier: '1',
  icon: '🎯',
  targetName: target.name,           // ← NEW
});
setLocation(`/partner-outreach?${params.toString()}`);
```

### In PartnerOutreachPlan

- `targetName` query param is read from `window.location.search`
- `firstName` = first word of `targetName`
- All 5 messages have `[First Name]` auto-replaced with `firstName`
- A blue personalization banner shows at the top: "Personalising for John Smith — `[First Name]` placeholders replaced with John"
- Users can still edit the textareas manually

---

## Success Criteria (Verified)

✅ Targets page loads with stats bar, filters, and empty state  
✅ Add Target works — persists to DB, refetches automatically  
✅ Edit Target works — pre-fills form, saves updates  
✅ Delete Target works — immediate removal  
✅ Status changes persist — PUT /api/targets/:id, queryKey invalidated  
✅ Dashboard summary updates — shared React Query cache  
✅ Generate Outreach works — URL params pass to PartnerOutreachPlan  
✅ `targetName` personalises messages (`[First Name]` → first name)  
✅ Existing Partner Strategy works — no regression  
✅ Existing Outreach works — no regression  
✅ Existing Pipeline works — no regression  
✅ TypeScript: 0 errors (`pnpm run typecheck`)

---

## Remaining TODOs (Phase 3D candidates)

1. **Auth layer** — populate `userId` / `organizationId` once Clerk/Replit Auth is added
2. **Bulk import** — CSV upload of target lists from LinkedIn exports
3. **Email activity log** — track each outreach send against a target
4. **Target → Pipeline sync** — when a target reaches "Active Partner", auto-create a pipeline entry
5. **Partner portal link** — generate a unique affiliate signup link per target
