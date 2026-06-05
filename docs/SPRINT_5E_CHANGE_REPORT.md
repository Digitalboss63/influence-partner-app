# Sprint Change Report — Phase 5E: Research-Based Outreach Letters

**Sprint name:** Phase 5E — Research-Based Outreach Letters  
**Commit SHA:** `fecb68811a02d1ed25e222a058a132021b5c6f5c`  
**Date:** 2026-06-05

---

## Goals Met

| Goal | Status |
|------|--------|
| New Research Letters page (target-aware, research-enriched) | ✅ |
| Inline research panel with save-to-target | ✅ |
| Personalisation score card (0–100%) | ✅ |
| 5-tab outreach sequence (First Email, DM, Follow-up 1, Follow-up 2, Handle Objections) | ✅ |
| Personalised letter generation using target research data | ✅ |
| Copy + Save as Draft Outreach Operation per tab | ✅ |
| Letters button on each target card in PartnerTargets | ✅ |
| Schema: audienceSize + contentAngle on partner_targets | ✅ |
| Nav item: Research Letters | ✅ |
| TypeScript 0 errors | ✅ |
| GitHub push | ✅ |

---

## Files Changed

| File | What changed | Why |
|------|-------------|-----|
| `lib/db/src/schema/index.ts` | Added `audienceSize text`, `contentAngle text` columns to `partnerTargetsTable` | Dedicated research fields for the letter generator; separate from the general `notes` field |
| `artifacts/influence-partner/src/lib/api-client.ts` | Added `audienceSize`, `contentAngle` to `ApiPartnerTarget` and `CreatePartnerTargetPayload` | Client contracts for new schema columns |
| `artifacts/influence-partner/src/lib/partnerOutreach.ts` | Added `ResearchContext` type, `generateResearchOutreachMessages()`, `computePersonalisationScore()`; all `buildFirstEmail/DM/FollowUp*` builders accept optional `ResearchContext` and inject target name, audience size, content angle, company | Research-aware letter generation |
| `artifacts/influence-partner/src/pages/ResearchOutreach.tsx` | **New page** — target selector, product selector, inline research panel, personalisation score checklist, Generate button, 5-tab sequence, per-tab copy + save-as-draft-op, sequence overview grid | Core Phase 5E deliverable |
| `artifacts/influence-partner/src/pages/PartnerTargets.tsx` | Added `onGenerateResearchLetters` prop + handler, `BookOpen` import, Letters button on target cards | Entry point from targets list |
| `artifacts/influence-partner/src/App.tsx` | Added `/research-outreach` route | Routing |
| `artifacts/influence-partner/src/components/Layout.tsx` | Added Research Letters nav item (BookOpen) between Outreach and Outreach Operations | Navigation |

---

## Key Decisions

- **Research fields as separate columns, not parsed from notes** — `audienceSize` and `contentAngle` are explicit columns so they can be individually patched via `PUT /targets/:id` without clobbering the free-form `notes` field. This also allows future filtering/sorting by audience size.
- **Generation is deterministic client-side** — `generateResearchOutreachMessages()` in `partnerOutreach.ts` is a pure function. No server round-trip, no AI API call. This keeps the app fully functional offline and eliminates API cost. Output quality comes from the template library + the research context the user provides.
- **Personalisation score is additive** — 60% from target data fields (6 fields), 20% from product selection, 20% from outreach angle length. Score drives behaviour: shows the user exactly what to fill in. Intentionally not shown after generation to avoid distraction.
- **Save-as-op per tab, not the whole sequence** — Each tab has its own Save as Draft Operation button. Users rarely want to queue all 5 messages at once; they send the first email, see if it's delivered, then save follow-ups later. Per-tab saves match that workflow.
- **Fixed: `<SelectItem value="">` causes runtime crash** — Radix UI Select rejects empty-string values. Used `"__no_targets__"` as the disabled placeholder value.

---

## What's Next

**Phase 6C — Campaign↔Outreach Link** (recommended)
- Campaign selector in Create Outreach Op dialog to auto-set `campaignId` on new ops
- Auto-suggest based on target's campaign assignment

**Research Letters enhancements** (future)
- Add `audienceSize` and `contentAngle` fields to the PartnerTargets Add/Edit dialog so research can be filled in at creation time (currently only editable from the Research Letters page)
- "Fill in later" reminder on the target card if research fields are empty

---

## Sprint Metrics

- New pages: 1 (ResearchOutreach.tsx)
- Schema changes: 2 columns (audienceSize, contentAngle on partner_targets)
- New library functions: 2 (generateResearchOutreachMessages, computePersonalisationScore)
- Modified library functions: 5 (all message builders now accept optional ResearchContext)
- New nav items: 1
- TypeScript errors at close: 0
