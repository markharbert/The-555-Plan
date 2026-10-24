# The 555 Plan by Mark Harbert

A guided video-confidence app with 15 missions in three rounds, personal planning, and saved progress.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on its managed PORT
- `pnpm --filter @workspace/the-555-plan run dev` — run the member web app
- `pnpm --filter @workspace/scripts run test:journey` — test onboarding, sequential locks, undo, progress, and score logic
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ES module bundle)
- Accounts: Replit-managed Clerk, verified email and local enrollment consent

## Where things live

- `artifacts/the-555-plan/src`: React app and brand styling
- `artifacts/api-server/src`: protected API, content, activity log, ClickFunnels worker
- `artifacts/api-server/src/content/program.ts`: initial editable mission and mindset copy
- `lib/db/src/schema`: Postgres schema
- `lib/api-spec/openapi.yaml`: API source of truth; regenerate clients after changes

## Architecture decisions

- Practice video bytes must remain in each user's browser, never on the server. Future admin screens see metadata only.
- Provider sync never blocks registration or mission completion. Queue jobs and activity events are committed alongside progress changes.
- Clerk owns credentials and email password reset. Local account access requires verified email, name, and affirmative marketing consent.
- ADMIN_EMAILS grants initial admin status at local enrollment only. Future admin role removals must not be reversed on login.

## Product

Phase 1 is implemented: branded landing, accounts, member layout and dashboard, onboarding, mindset, 15 sequential missions, default cues, completion ratings, undo protection, activity events, and background ClickFunnels contact/tag sync.

Not implemented yet: Phase 2 recorder and video library, Phase 3 AI personalization, Phase 4 graduation/challenge/advanced progress, Phase 5 admin controls and account deletion. These are visibly identified as later releases, not simulated functionality.

ClickFunnels requires CLICKFUNNELS_API_TOKEN, CLICKFUNNELS_SUBDOMAIN (bare subdomain, not a URL), and CLICKFUNNELS_WORKSPACE_ID in project secrets. Without them, jobs stay pending for later delivery. ADMIN_EMAILS is a comma-separated verified-email allowlist; no default administrator is seeded.

## User preferences

- Follow the attached brand guide when it conflicts with visual details in the brief.
- Never use the word "free" or em dashes in user-facing copy.
- No payments, checkout, or paid tiers.
- Finish and test each build phase before the next; give a short summary and required setup after each phase.

## Gotchas

- Do not send tag_ids in a ClickFunnels contact upsert: that replaces unrelated tags. Apply each program tag through applied_tags instead.
- Do not bypass authentication to screenshot member pages. Signed-out screenshots can verify public pages only.
- Keep canonical Clerk hostname key selection, proxy middleware order, and unconditional proxyUrl support for production.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
