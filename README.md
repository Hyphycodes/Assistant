# Hyphy HQ

Hyphy HQ is a private concierge command center for one owner and one trusted assistant. The owner captures intent with almost no setup; the assistant turns open loops into researched, prepared, auditable movement.

This repository is a production-shaped vertical slice built from the ten-document Hyphy HQ build pack. It intentionally ships with a rich fictional workspace so the complete product can be evaluated before external credentials exist.

## What works now

- Role-aware demo sign-in for Jerry (owner) and Maria (assistant), guarded by an HTTP-only session cookie and Next.js Proxy.
- Home with Needs You, explicit approve/reject/question/alternatives/save-later owner controls, Moved Today, Coming Up readiness, and ideas to revisit.
- URL-addressable Things views for active work, Needs You, In Motion, Waiting, Ready, Someday, and Done; each row exposes its next action, blocker, readiness, counts, and movement.
- An accessible New/Edit Thing workflow with role-aware ownership, validation, reset/cancel states, subtitle, description, dates, location, owner, priority, budget, tags, permissions, and operating signals.
- Work-first detail pages with editable sections, typed items, typed custom fields, subthings, relationships, products/orders, notes, links, dates, exact activity deltas, and status.
- Inbox capture for text, links, photos, files, and uploaded audio with preserved raw input and reviewable deterministic proposals.
- Assistant workbench with attributable movement, follow-up drafting, source/option capture, approval preparation, and status changes. Owner preview is read-only.
- Global grouped Search plus Contacts, Templates, Preferences, Calendar readiness, and a restorable Archive.
- Explicit disconnected states for integrations. No demo action implies that a message, purchase, booking, or call happened.
- Authenticated server commands with atomic local persistence and an optional Supabase snapshot backend, plus relational migrations covering the flexible object model, RLS, one-owner invariant, and owner-only approval/integration policies.
- Unit/security tests and desktop/mobile browser flows.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose Jerry or Maria. Demo edits persist on the server, survive refresh and separate browser sessions, and can be reset from Settings.

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

The interface uses one authenticated command route. It loads the latest revision, applies a validated role-aware command, writes successfully, and only then returns the new state to the client. Without credentials it uses an atomic `.data` server file locally. With the three Supabase variables below it stores the full normalized workspace in a revision-checked Postgres snapshot:

1. Create a Supabase project and configure the values in `.env.example`.
2. Apply both files in `supabase/migrations/` in timestamp order.
3. Create local/demo Auth users before running `supabase/seed.sql`; no sample password is committed.
4. Set `HYPHY_WORKSPACE_ID` to the target workspace UUID. `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` complete the data connection.
5. Before accepting private user data, replace the demo session adapter in `src/lib/server/auth.ts` with Supabase Auth claims and keep every command behind the same authorization boundary.
6. Keep RLS enabled and verify owner, assistant, cross-workspace, suspended-user, and unauthenticated cases against the actual project.

The Supabase snapshot is the durable hosted source of truth. Vercel without Supabase deliberately reports `ephemeral-server` and writes only to `/tmp`; that mode is suitable for evaluation, not durable private data.

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

The app can deploy to Vercel as an honest preview. A durable deployment must connect Supabase; a private production deployment must also replace demo auth, configure private Storage buckets, and keep provider secrets only in the deployment environment.
