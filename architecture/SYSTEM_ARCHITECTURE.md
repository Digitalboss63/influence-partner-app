# System Architecture — Influence Partner App

**Last Updated:** 2026-06-02  
**Status:** Draft / Pre-development

> ⚠️ This document reflects the intended architecture for Phase 1. Decisions marked **[TBD]** require confirmation before development begins.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│              React + TypeScript + Vite               │
│                   TailwindCSS UI                     │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / REST or GraphQL
┌──────────────────────▼──────────────────────────────┐
│                   Backend / API                      │
│               [TBD: Node/Express |                   │
│                Supabase | Firebase]                  │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
┌──────────▼──────────┐  ┌───────▼───────────────────┐
│      Database        │  │    Authentication Service  │
│  [TBD: PostgreSQL |  │  │  [TBD: Supabase Auth |    │
│   Supabase | SQLite] │  │   Clerk | Auth0 | Custom] │
└─────────────────────┘  └───────────────────────────┘
```

---

## Frontend

| Concern | Decision |
|---|---|
| Framework | React 18+ with TypeScript |
| Build Tool | Vite |
| Styling | TailwindCSS |
| Routing | React Router v6 |
| State Management | [TBD — Zustand / React Query / Context] |
| Forms | [TBD — React Hook Form / Zod] |
| HTTP Client | Axios or native fetch |

### Key Design Principles
- Component-driven architecture
- Feature-based folder structure (`/features/brands`, `/features/influencers`, etc.)
- Shared UI components in `/components/ui`
- Strict TypeScript — no `any` in production code

---

## Backend [TBD]

### Option A — Supabase (Recommended for Phase 1 speed)
- PostgreSQL database hosted by Supabase
- Supabase Auth for authentication
- Row-level security (RLS) policies for data isolation
- Supabase Storage for profile images
- Auto-generated REST API

### Option B — Custom Node/Express API
- Node.js + Express
- PostgreSQL (Neon, Railway, or self-hosted)
- JWT-based auth (or Clerk)
- Manual API routes

**Recommendation:** Supabase for Phase 1 — fastest to ship, proven stack, free tier sufficient.

---

## Data Model (Preliminary)

```
users
├── id (uuid)
├── email
├── role: 'brand' | 'influencer'
├── created_at
└── updated_at

brand_profiles
├── id (uuid)
├── user_id (FK → users)
├── name
├── industry
├── description
├── logo_url
└── ...

influencer_profiles
├── id (uuid)
├── user_id (FK → users)
├── display_name
├── bio
├── niche
├── primary_platform
├── follower_count
└── ...

inquiries
├── id (uuid)
├── brand_id (FK → brand_profiles)
├── influencer_id (FK → influencer_profiles)
├── status: 'pending' | 'accepted' | 'declined'
├── message
└── ...

campaigns
├── id (uuid)
├── inquiry_id (FK → inquiries)
├── title
├── status: 'draft' | 'active' | 'completed'
├── deliverables_notes
└── ...

messages
├── id (uuid)
├── inquiry_id (FK → inquiries)
├── sender_id (FK → users)
├── content
└── sent_at
```

---

## Deployment [TBD]

| Layer | Option |
|---|---|
| Frontend | Vercel (preferred) / Netlify |
| Backend API | Vercel Functions / Railway / Render |
| Database | Supabase Cloud / Neon / Railway |
| Domain | TBD |
| CI/CD | GitHub Actions (on push to `main`) |

---

## Environment Variables

```env
# API
VITE_API_URL=

# Supabase (if used)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Auth (if using Clerk/Auth0)
VITE_AUTH_DOMAIN=
VITE_AUTH_CLIENT_ID=
```

---

## Security Considerations

- All API requests authenticated via JWT / session token
- Database access restricted via Row-Level Security (if Supabase)
- Environment variables never committed to git
- CORS restricted to known origins in production
- Input validation on both client and server
- No sensitive data stored in localStorage

---

## Open Architecture Decisions

| Decision | Options | Status |
|---|---|---|
| Backend approach | Supabase vs. Custom Node API | **[TBD]** |
| Auth provider | Supabase Auth vs. Clerk vs. Custom | **[TBD]** |
| Hosting | Vercel vs. Railway vs. Render | **[TBD]** |
| State management | Zustand vs. React Query vs. Context | **[TBD]** |
| Real-time messaging | Supabase Realtime vs. Polling vs. WebSockets | **[TBD]** |
