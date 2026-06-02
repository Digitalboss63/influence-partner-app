# Phase 1 Scope — Influence Partner App

**Last Updated:** 2026-06-02  
**Status:** Scoping / Pre-development

---

## Phase 1 Goal

Ship a functional MVP that validates the core loop:  
**Brand discovers influencer → sends outreach → manages a basic campaign.**

This phase is about proving the concept works, not building everything.

---

## In Scope

### Authentication
- [ ] User registration and login (email/password)
- [ ] Role selection at signup: **Brand** or **Influencer**
- [ ] Basic session management / JWT

### Brand-Side Features
- [ ] Brand profile creation (name, industry, description, logo)
- [ ] Influencer search with basic filters (niche, follower range, platform)
- [ ] Influencer profile view (public data only in Phase 1)
- [ ] Send partnership inquiry / outreach message
- [ ] View outreach history (sent, responded, declined)

### Influencer-Side Features
- [ ] Influencer profile creation (bio, niche, platforms, audience size)
- [ ] View incoming partnership inquiries
- [ ] Accept or decline inquiries
- [ ] Basic messaging thread per inquiry

### Campaign Management (Lightweight)
- [ ] Create campaign linked to accepted inquiry
- [ ] Track campaign status: Draft → Active → Completed
- [ ] Add campaign notes / deliverables description

### General
- [ ] Responsive UI (desktop-first, mobile-compatible)
- [ ] Basic dashboard per role (brand or influencer home)

---

## Out of Scope (Phase 1)

- Payment processing / invoicing
- Contract generation or e-signatures
- Analytics / ROI tracking
- Social media API integrations (Instagram, TikTok, YouTube)
- AI-powered matching or recommendations
- Notifications (email, push)
- Admin panel
- Multi-user brand accounts / team seats
- Public influencer marketplace / discovery landing page

---

## Deliverables

| Deliverable | Description |
|---|---|
| Working web app | Deployed and accessible at a URL |
| Brand flow | Full loop from signup → search → outreach |
| Influencer flow | Full loop from signup → profile → inquiry response |
| Campaign tracking | Basic status management |
| Documentation | README, architecture docs, inline code comments |

---

## Definition of Done (Phase 1)

- A brand user can sign up, find an influencer, and send an inquiry.
- An influencer user can sign up, receive that inquiry, and respond.
- An accepted inquiry can be turned into a tracked campaign.
- The app is deployed to a staging/production URL.
- No critical bugs in the primary user flows.

---

## Open Questions

- [ ] What database/backend service are we using? (Supabase? Firebase? Custom Node API?)
- [ ] Hosting target? (Vercel? Netlify? Railway?)
- [ ] Are we building a real influencer dataset or mocking data for MVP?
- [ ] Authentication provider? (Custom? Clerk? Auth0? Supabase Auth?)

---

## Timeline

> To be defined once tech stack decisions are made.
