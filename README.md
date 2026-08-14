# Hyphy HQ

Hyphy HQ is a private concierge command center for one owner and one trusted assistant. The owner captures intent with almost no setup; the assistant turns open loops into researched, prepared, auditable movement.

This repository is a production-shaped vertical slice built from the ten-document Hyphy HQ build pack. It intentionally ships with a rich fictional workspace so the complete product can be evaluated before external credentials exist.

## What works now

- Role-aware demo sign-in for Jerry (owner) and Maria (assistant), guarded by an HTTP-only session cookie and Next.js Proxy.
- Home with Needs You, distinct approve/hold/reject/edit owner controls, Moved Today, Coming Up readiness, and ideas to revisit.
- URL-addressable Things views for active work, Needs You, In Motion, Waiting, Ready, Someday, and Done; each row exposes its next action, blocker, readiness, counts, and movement.
- An accessible New/Edit Thing workflow with role-aware ownership, validation, reset/cancel states, dates, location, permissions, and operating signals.
- Work-first detail pages with stable section anchors plus editable working briefs, context sections, notes, links, options, dates, and status.
- Inbox capture for text, links, photos, files, and uploaded audio with preserved raw input and reviewable deterministic proposals.
- Assistant workbench with attributable movement, follow-up drafting, source/option capture, approval preparation, and status changes. Owner preview is read-only.
- Calendar readiness and Archive search across Things, people, options, notes, activity, and original captures.
- Explicit disconnected states for integrations. No demo action implies that a message, purchase, booking, or call happened.
- Supabase relational migration covering the complete v1 data model, RLS, one-owner invariant, and owner-only approval/integration policies.
- Unit/security tests and desktop/mobile browser flows.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose Jerry or Maria. Demo edits persist only in that browser’s local storage and can be reset from Settings.

No environment variables are required for demo mode. Copy `.env.example` to `.env.local` only when connecting providers.

## Quality gates

```bash
npm run typecheck
npm run lint
npm run test
npm run check:sql
npm run build
npm run test:e2e
git diff --check
```

Playwright needs Chromium once per machine:

```bash
npx playwright install chromium
```

## Production data plane

The interface currently uses a versioned local demo provider so the experience remains complete without credentials. Every scoped UI mutation is validated by an authenticated server route before the browser updates demo state; the browser remains the demo persistence layer. The production boundary is intentionally narrow:

1. Create a Supabase project and configure the values in `.env.example`.
2. Apply `supabase/migrations/202608140001_hyphy_hq.sql`.
3. Create local/demo Auth users before running `supabase/seed.sql`; no sample password is committed.
4. Replace the demo session implementation through `src/lib/server/auth.ts`, then replace the local state commits in `AppProvider` with database-backed commands. Retain the validation and permission rules in `src/app/api/demo/mutate/route.ts`.
5. Keep RLS enabled and verify owner, assistant, cross-workspace, suspended-user, and unauthenticated cases against the actual project.

The migration is the durable production source of truth. Browser local storage is not a production database, does not sync between browsers, and must not hold real private data.

## Provider seams

- `src/lib/ai/provider.ts` — deterministic fallback plus AI extraction adapter contract.
- `src/lib/integrations/provider.ts` — connected/disconnected status and honest external-action states.
- `src/lib/server/auth.ts` — server-side session/workspace authorization contract.

Every future adapter must be idempotent, scoped to a workspace, and preserve the difference between drafted, awaiting approval, attempted, confirmed, failed, and needs review.

## Repository map

```text
src/app/                 App Router pages, auth handlers, route states
src/components/          shell, interaction state, domain UI
src/lib/                 domain rules, seed fixtures, provider seams
supabase/migrations/     schema, invariants, and RLS
supabase/seed.sql        safe Auth-dependent seed entrypoint
tests/                   unit, security-contract, and browser flows
docs/                    architecture decisions and implementation notes
```

## Deployment

The app can deploy to Vercel as-is in demo mode. A real deployment should connect Supabase before accepting private user data, replace demo auth, configure private Storage buckets, and set provider secrets only in the deployment environment.
