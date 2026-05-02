# Proof of Life

A full-stack web app for buildathon participants to turn a 24-hour sprint into a judge-ready public proof page. Builders document the resurrection of an abandoned/broken project as an "evidence record" — timeline of breakthroughs and survived blockers, screenshots, AI-generated judge briefing and demo script.

## Architecture

Monorepo (pnpm workspaces).

- `artifacts/proof-of-life` — React + Vite frontend (port 24722, mounted at `/`).
- `artifacts/api-server` — Express 5 backend (port 8080, mounted at `/api`). Uses Drizzle ORM over PostgreSQL.
- `lib/db` — shared Drizzle schema (`projects`, `milestones`).

No OpenAPI / no codegen. Backend routes are hand-written with `zod` for input validation; frontend uses a hand-written typed fetch client at `artifacts/proof-of-life/src/lib/api.ts`.

## Data model

- `projects` — id, slug (public URL), edit_token (gates editing — no auth), title, builder_name, one_liner, starting_state, current_state, replit_url, demo_url, start_time, published, generated_summary, generated_demo_script.
- `milestones` — belongs to project (cascade delete), sort_order, occurred_at, type, title, description, blocker, breakthrough, screenshot_data (base64 data URL stored inline in the DB, capped at 500KB, png/jpeg/webp only).

## Routes

Frontend (wouter, base = `import.meta.env.BASE_URL`):
- `/` — landing
- `/new` — create a new case
- `/edit/:id?token=...` — authoring console (token also persisted in localStorage)
- `/p/:slug` — public proof page (only when published)
- `/card/:slug` — condensed shareable evidence card

Backend (`/api` prefix):
- `GET  /projects/example` — returns the seeded example case
- `GET  /projects/by-slug/:slug` — public read (404s if unpublished)
- `POST /projects` — create (returns edit_token)
- `GET    /projects/:id` — full project incl. token (requires `x-edit-token` header or `?token=`)
- `PATCH  /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/:id/milestones` / `PATCH .../:mid` / `DELETE .../:mid`
- `POST /projects/:id/generate-summary` — Anthropic via Replit AI Integrations
- `POST /projects/:id/generate-demo-script` — same; both gracefully return 503 if AI is unconfigured or upstream is overloaded so the user can write the briefing manually

## AI

Anthropic via Replit AI Integrations proxy (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL` / `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, auto-provisioned). Model `claude-sonnet-4-6`. App is fully usable without AI configured — both AI endpoints return 503 with a clear message and the frontend falls back to manual textareas for the briefing and demo script.

## Visual identity

Dark "evidence room" aesthetic — near-black background, bone/off-white text, amber accent, muted green for the "ALIVE" status pill, desaturated rust-red for blockers only. Editorial serif headlines (Playfair Display), monospace labels (Space Mono), DM Sans body. Tasteful motion on timeline and the heartbeat pill.

## Conventions

- Mutations on the frontend use `@tanstack/react-query` and invalidate both the edit query and any cached public-by-slug query so the public page stays in sync.
- Edit token can be sent as `x-edit-token` header (preferred) or `?token=` query param.
- DB schema changes go in `lib/db/src/schema/`, then `pnpm --filter @workspace/db run push`. Production schema migration is handled automatically by Replit's Publish flow.
