# Phase 5B — Outreach Operations

## Purpose

Outreach Operations transforms the Outreach Generator from a content generator into a full outreach management system. Users can track every creator contact from draft to converted partner, manage follow-ups, record replies, and move creators through the partnership lifecycle — all without automation or email APIs.

---

## Workflow Position

```
Product → Partner Strategy → YouTube Discovery → Qualification
  → Contact Intelligence → Targets
  → Outreach (Generator) → Outreach Operations → Pipeline
```

---

## Data Model

### Table: `outreach_operations`

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `target_id` | UUID (FK → partner_targets, nullable) | Linked partner target |
| `product_id` | UUID (FK → products, cascade delete) | Product context |
| `creator_name` | TEXT NOT NULL | Creator/influencer name |
| `contact_method` | ENUM | Email / Instagram DM / TikTok DM / LinkedIn / Website Contact Form |
| `contact_destination` | TEXT | Email address, handle, or URL |
| `outreach_subject` | TEXT | Subject line or message title |
| `outreach_message` | TEXT | Full outreach message body |
| `outreach_status` | ENUM | Current lifecycle stage (see below) |
| `priority` | ENUM | low / medium / high |
| `sent_at` | TIMESTAMP | When marked Sent |
| `follow_up_due` | TIMESTAMP | Next follow-up date |
| `last_activity_at` | TIMESTAMP | Last status change or update |
| `replied_at` | TIMESTAMP | When marked Replied |
| `notes` | TEXT | User notes about the contact |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

### Enum: `outreach_status`

| Value | Meaning |
|---|---|
| `draft` | Message written, not yet reviewed |
| `ready` | Reviewed, queued to send |
| `sent` | Message sent to creator |
| `replied` | Creator responded |
| `interested` | Creator expressed interest |
| `negotiating` | Deal terms being discussed |
| `converted` | Partnership confirmed |
| `declined` | Creator said no |
| `inactive` | No response after follow-ups |

### Enum: `outreach_priority`

`low` | `medium` | `high`

### Enum: `outreach_contact_method`

`Email` | `Instagram DM` | `TikTok DM` | `LinkedIn` | `Website Contact Form`

---

## Status Transition Rules

Allowed next states per status:

| Current | Can Move To |
|---|---|
| draft | ready, sent, declined |
| ready | sent, declined |
| sent | replied, declined, inactive |
| replied | interested, declined |
| interested | negotiating, declined |
| negotiating | converted, declined |
| converted | (terminal) |
| declined | (terminal) |
| inactive | sent (re-engage) |

---

## Target Status Sync

When `outreach_status` changes, the linked `partner_target.status` is automatically updated (only when `target_id` is set):

| Outreach Status | Target Status |
|---|---|
| sent | Contacted |
| replied | Replied |
| interested | Meeting Scheduled |
| negotiating | Negotiating |
| converted | Active Partner |
| declined | Rejected |

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/outreach-operations` | List records (filter: productId, status) |
| `GET` | `/api/outreach-operations/metrics` | Aggregated metrics + follow-up queue counts |
| `GET` | `/api/outreach-operations/:id` | Single record |
| `POST` | `/api/outreach-operations` | Create a new operation |
| `PATCH` | `/api/outreach-operations/:id` | Update status, notes, follow-up, priority, message |
| `DELETE` | `/api/outreach-operations/:id` | Delete a record |

### POST /api/outreach-operations

Required: `creatorName`, `contactMethod`

Optional: `contactDestination`, `outreachSubject`, `outreachMessage`, `outreachStatus` (default: draft), `priority` (default: medium), `targetId`, `productId`, `notes`, `followUpDue`

### PATCH /api/outreach-operations/:id

All fields optional. Automatic side effects:
- Setting `outreachStatus: "sent"` → writes `sentAt` timestamp
- Setting `outreachStatus: "replied"` → writes `repliedAt` timestamp
- Any update → refreshes `lastActivityAt` and `updatedAt`
- Status changes → syncs linked target status (if `targetId` exists)

### GET /api/outreach-operations/metrics

Returns:
```json
{
  "drafts": 0,
  "ready": 0,
  "sent": 0,
  "replied": 0,
  "interested": 0,
  "negotiating": 0,
  "converted": 0,
  "declined": 0,
  "inactive": 0,
  "total": 0,
  "followUp": {
    "overdue": 0,
    "dueToday": 0,
    "dueThisWeek": 0
  }
}
```

---

## UI Routes

| Route | Component | Description |
|---|---|---|
| `/outreach-operations` | `OutreachOperations.tsx` | Main management page |
| `/help/outreach-operations` | `HelpOutreachOperations.tsx` | 8-section help guide |

---

## Outreach Operations Page

### Header
- Title: "Outreach Operations"
- Subtitle: "Track outreach activity, follow-ups, responses, and partnership progress."
- Actions: How It Works, New Operation

### Product Selector
- Filters all operations and metrics by selected product

### Metrics Row
7 clickable metric tiles: Drafts, Ready, Sent, Replied, Interested, Negotiating, Converted
- Each tile click filters the list to that status
- Overdue tile shown when overdue follow-ups exist

### Follow-Up Queue
Shown above the card grid when any follow-ups are set:
- **Overdue** (red) — past due, not converted/declined/inactive
- **Due Today** (amber) — due today
- **Due This Week** — next 7 days

### Filter Tabs
All / Draft / Ready / Sent / Replied / Interested / Negotiating / Converted / Declined

### Sort Options
Most Recent / Follow-up Due / Highest Priority

### Outreach Cards

Each card shows:
- Creator Name + Status badge + Priority indicator
- Contact method + Contact destination
- Last activity (relative) + Follow-up date (colour-coded urgency)
- Sent timestamp + Reply timestamp when set
- Notes preview (first 2 lines)
- Status action buttons (context-aware next states)
- Expand/collapse for full message, notes editor, follow-up picker, delete

### Create Operation Form
Inline form (no modal) with all fields.

### Empty State
Links to Create Operation and Outreach Generator.

---

## Outreach Generator Integration

A **Create Operation** button appears in the generated message card header after generation. It:
1. Creates an operation with `status: draft`
2. Pre-fills: `creatorName`, `contactMethod` (mapped from channel), `outreachSubject`, `outreachMessage`, `productId`
3. After save, shows "View Operations →" button that links to `/outreach-operations`
4. Toast notification: "Saved as draft in Outreach Operations"
5. Reset on Regenerate so users can save each variation separately

Channel → Contact Method mapping:
- Email → Email
- Instagram DM → Instagram DM
- TikTok DM → TikTok DM
- YouTube Sponsorship → Email

---

## Dashboard — Outreach Health Widget

A new **Outreach Health** card is injected above the Funnel Health card.

Shows 7-step funnel with conversion percentages:
```
Drafts → Ready → Sent → Replies → Interested → Negotiating → Converted
```

- Each step shows count + connecting conversion percentage
- Each step is clickable → navigates to Outreach Operations
- Overdue follow-ups banner shown in red when any exist

Only shown when metrics are loaded (conditional render).

---

## Navigation

New nav item added: **Outreach Operations** (Send icon) between Outreach and Pipeline.

Full nav order:
```
Dashboard → Products → Discover Creators → Partner Strategy
→ Discovery Workspace → YouTube Discovery → Qualification
→ Contact Intelligence → Targets → Outreach → Outreach Operations → Pipeline
```

---

## Verification Checklist

- [x] TypeScript 0 errors (all 4 packages)
- [x] `outreach_operations` table created in DB
- [x] `outreach_status`, `outreach_priority`, `outreach_contact_method` enums created
- [x] 6 API routes registered and responding
- [x] `/outreach-operations` page loads
- [x] `/help/outreach-operations` page loads
- [x] Metrics API returns correct shape
- [x] Status transitions work (sequential enforcement)
- [x] Follow-up queue shows overdue / today / this week buckets
- [x] Target status sync on status change (when targetId present)
- [x] `sentAt` auto-stamped when marked Sent
- [x] `repliedAt` auto-stamped when marked Replied
- [x] Create Operation form (inline, no modal)
- [x] Delete with confirmation
- [x] Notes inline editor
- [x] Follow-up date picker (inline)
- [x] Outreach Generator "Create Operation" button
- [x] Outreach Generator "View Operations →" after save
- [x] Dashboard Outreach Health card with funnel + conversion %
- [x] Dashboard overdue follow-up banner
- [x] Nav: Outreach Operations between Outreach and Pipeline
- [x] No regressions on Qualification, Contact Intelligence, Targets, Pipeline

---

## Known Limitations

- No email send capability (intentional — Phase 5B is management only)
- No follow-up auto-send or sequence automation
- No AI reply analysis
- No calendar integration
- Target status sync requires `targetId` to be set on the operation — manual operations without a target link do not sync
- `creator_id` FK not linked (outreach operations use `creator_name` text, not DB creator ID) — Phase 5C may add this link

---

## Phase 5C Dependencies

- Gmail integration: copy-to-clipboard with sent tracking
- Calendar sync: follow-up date → Google Calendar event
- Bulk status updates: pipeline stage changes propagate back to outreach operations
- Reply detection: webhook or polling-based reply tracking
- Operations ↔ Pipeline bidirectional sync (currently one-way: ops → target status)
- LinkedIn DM link generation (direct LinkedIn message URL)
