# Influence Partner App

A SaaS tool for locating, scoring, and recruiting influencers/affiliates for high-commission (35–40%) partnership deals.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/influence-partner run dev` — run the frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TypeScript + Tailwind + shadcn/ui + wouter + react-hook-form + zod + @tanstack/react-query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) — currently only /healthz in spec; custom hooks used for app routes

## Where things live

- `artifacts/influence-partner/` — React frontend app
  - `src/context/AppContext.tsx` — global state, React Query data fetching, all API mutations
  - `src/lib/api-client.ts` — typed fetch wrappers for all API endpoints
  - `src/lib/scoring.ts` — fitScore/fitLabel/suggestedCommission computation
  - `src/lib/productIntelligence.ts` — deterministic product intelligence engine
  - `src/pages/` — Dashboard, ProductIntake, CreatorDiscovery, CreatorDetail, OutreachGenerator, CRMPipeline
  - `src/types/influencePartner.ts` — canonical frontend types
- `artifacts/api-server/` — Express 5 API
  - `src/routes/` — products, creators, pipeline, outreach
- `lib/db/src/schema/index.ts` — source of truth for DB schema (Drizzle)

## Architecture decisions

- **Scores computed on frontend**: fitScore, fitLabel, suggestedCommission are derived from raw creator fields (audienceMatch, platformFit, productFit, competitiveConflict, engagementRate) using `computeFitScore()` — no per-product score API calls needed for the list views.
- **Intelligence applied locally**: `generateProductIntelligence()` is deterministic, so it runs client-side on API products rather than storing intelligence fields in the DB (sprint 1 stores them in `product_intelligence_snapshots` for future use).
- **No OpenAPI codegen for app routes**: Custom React Query hooks in AppContext rather than updating the spec, because the app routes were added after initial codegen.
- **Pipeline stage = per creator (UI) / per creator×product (DB)**: The UI treats stage as a single per-creator value; the frontend takes the first matching pipeline entry for `updateCreatorStage`.
- **Optimistic updates on stage changes**: `updateCreatorStage` updates the React Query cache immediately, then fires `PUT /api/pipeline/:id`; on error it invalidates to revert.

## Product

- **Dashboard**: Revenue projections, AI-recommended next action, workflow progress tracker, pipeline summary, top creator opportunities
- **Product Intake**: Form → local intelligence report (market, buyer persona, creator categories, revenue potential)
- **Creator Discovery**: 15 pre-scored creators with filters (platform, niche, followers, fit score, creator type); pipeline stage move
- **Creator Detail**: Full analysis (audience fit, platform fit, engagement quality, competitor signal, deal structure, outreach angle)
- **Outreach Generator**: Personalised messages per creator × product × channel × tone
- **CRM Pipeline**: Kanban board with drag-and-drop; all stage changes persisted to DB

## User preferences

- A proper **Sprint Change Report** is required after every sprint. Format: Sprint name, commit SHA, summary of goals met, files changed (with what and why), key decisions, what's next.

## Gotchas

- Do not run `pnpm dev` at the workspace root — use workflow restart or per-package filter commands.
- `pnpm run typecheck` must pass with 0 errors before pushing.
- GitHub push is done via Node.js Git Data API script (`/tmp/gh_push.mjs`) — direct `git push` is blocked in the sandbox.
- The `selectedProductId` is persisted in localStorage (`ip_selected_product`) — the only remaining localStorage usage.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
