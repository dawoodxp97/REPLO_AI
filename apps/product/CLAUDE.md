# apps/product — CLAUDE.md

Next.js 16 App Router: dashboard, import, job progress, learning player, public tutorial pages (SSR), library, settings, operator. **No business logic** — talks to `apps/api` through the shared contract. Rules: root `RULES.md` §5; visual rules: `DESIGN.md`.

## Layout

```
src/proxy.ts                         per-request CSP nonce (D-068)
src/app/(app)/…                      signed-in shell (AuthGate + nav): /, /library, /repositories, /import, /jobs/[jobId], /settings/[section]
src/app/operator/…                   operator screens; a server check returns 404 to everyone else (D-077)
src/app/login/                       sign-in page (GitHub, Google, email and password)
src/app/tutorials/[owner]/[repo]/[slug]/…   public overview (SSR), learn/[chapterKey]/[lessonKey], code (source explorer), progress, opengraph-image (public only)
src/components/                      shared components (AppNav, ConfirmDialog, ErrorPanel, LinkButton, PageHeader, RadioCardGroup, Sheet, SafeMarkdown)
src/features/<name>/                 composites: session, import, keys, jobs, notifications, library, search, dashboard, tutorials, diagram, player, quiz, progress, repositories, settings, operator
src/hooks/                           browser hooks (media query, debounce, visibility)
src/lib/orpc.ts                      typed oRPC client + TanStack Query utils (contract TYPE only); per-call context carries the Idempotency-Key
src/lib/server-client.ts             oRPC client for server components; forwards the caller's cookies to the API
src/lib/env.ts, server-env.ts        public env and API_INTERNAL_URL, both parsed with Zod
src/lib/csp.ts                       Content-Security-Policy builder (pure, tested)
scripts/start.ts                     runs the standalone server with static assets (use after `next build`)
e2e/                                 Playwright journeys; fixtures/ and support/ hold the recorded responses and the mock API
```

## Do / don't

- Import only `@replo/contracts` (types for the client; Zod schemas at boundaries, D-071) and `@replo/ui`. Never `@replo/ai`, `@replo/repo-analysis`, or `apps/api` (lint enforces).
- Server state = TanStack Query via `orpc.<area>.<proc>.queryOptions()/mutationOptions()`. URL state in search params (`?ref`, `?share`, `?version`, `?resume`, `?path`). No global store.
- Handle typed errors with `apiErrorDetails(err)` (`src/lib/api-error.ts`) and map codes to copy in the feature (see `import/import-errors.ts`).
- A `Button` is for actions. Navigation is a `LinkButton` or `Link` (D-069).
- No comments in code (D-070). Every page is dynamic (D-068): do not assume build-time prerendering.
- No inline `style` props in server-rendered markup (the CSP forbids them). Heavy renderers load when visible and write styles through the CSS object model (D-076).
- Public pages must read without JavaScript and must not show private data (FR-SHR-2).
- No ads anywhere (ADR-007). Links in Markdown go through `isAllowedLink` only.

## Status

F0 to F6 are implemented and F7 is in progress. Verified locally: unit tests (68), typecheck, lint, the production build, and 98 Playwright tests on desktop and phone against the standalone production server with the mock API. Not verified: staging, the live API, the GitHub App and sign-in, real provider keys, Lighthouse.

Open: notification counts pushed over SSE; a "system" theme option; the explorer renders the whole tree without virtualisation (MEM D-080). See `ROADMAP.md` (F2–F7) and `MEM.md` (D-074 to D-079).

## Commands

```bash
pnpm --filter @replo/product dev | build | typecheck | lint | test
pnpm --filter @replo/product test:e2e   # builds the product, starts the standalone server on 3101 and the mock API on 4100
pnpm --filter @replo/product start      # after build: runs scripts/start.ts
```
