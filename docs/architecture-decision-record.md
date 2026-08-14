# Architecture decision record

## Context

The source repository was empty. The build contract requires a calm, useful v1 before external integrations, while also requiring a durable Postgres/RLS boundary and honest failure states.

## Decision

Use Next.js App Router, React, TypeScript, Tailwind’s CSS build pipeline, Zod validation, Supabase-compatible SQL, Vitest, and Playwright.

The runnable slice uses an explicit server command boundary:

- An HTTP-only cookie distinguishes owner and assistant sessions on the server.
- A versioned server record holds the fictional workspace; the client never commits data before the authenticated server write succeeds.
- Domain rules live outside view components.
- The same command store uses atomic local files in development and a revision-checked Supabase workspace snapshot when configured.
- AI falls back to deterministic, reviewable extraction. It never blocks capture.
- External providers default to `disconnected` and cannot return a false success.

## Why this is the smallest safe choice

A fake network integration would violate the product contract. Requiring Supabase credentials to see the product would make the first launch empty and block evaluation. The adapter boundary lets the complete owner/assistant workflow run today while keeping the production tenant/security model concrete.

## Security boundaries

- Next.js Proxy is only a navigation guard; server mutations must call the authorization adapter too.
- Production tables carry `workspace_id`, enable RLS, and derive access from active workspace membership.
- Exactly one active owner is enforced by a partial unique index.
- Assistants can prepare approvals, but only owners can resolve them or manage integrations.
- Media paths remain private and must be exchanged for short-lived signed URLs after authorization.
- Provider credentials never belong in ordinary application tables or client bundles.

## Consequences and deferred production work

- Local server-file changes synchronize across browsers on one development server. Vercel fallback storage is explicitly ephemeral until Supabase is configured.
- Supabase Auth/Storage, job runners, realtime collaboration, and provider credentials remain deployment work.
- Browser upload controls preserve demo metadata only; real binary persistence starts when private Storage is connected.
- Deterministic extraction is intentionally conservative and cannot transcribe audio.
