# apps/api — CLAUDE.md

Fastify 5 + oRPC + own auth (`modules/identity`) + Drizzle + pg-boss. Two processes from one package. Rules: root `RULES.md` §3–§4. Requirements: `PRD.md` §4–§5.

## Layout

```
src/main.http.ts       HTTP server: helmet, cors(PRODUCT_ORIGIN), rate-limit, /healthz /readyz, auth, webhook, SSE, /rpc/*
src/main.worker.ts     pg-boss workers (generate, reaper, retention purge) + :7201/healthz
src/composition.ts     builds every service (`createDomainServices`, `createServices`)
src/orpc.ts            `os` (base) and `authed` builders — implement(contract)
src/router.ts          composes module routers
src/request-context.ts RequestContext + Services types and `buildRequestContext`
src/worker/            generate-course handler (stage loop, heartbeat, retry), job-payload (queue names, payload, timeouts), errors, with-timeout
src/platform/          config (Zod env), db (schema, client, query-helpers), logger (redaction), crypto/key-vault, errors, http guards, sse
src/modules/jobs/      generation_jobs lifecycle: create/cancel/retry, claim/heartbeat/reaper store, job ending, history, SSE route
src/modules/pipeline/  stage handlers (summaries → publish), checkpoints, prompt inputs, grounding (pure)
src/modules/courses/  catalog, content (overview/chapter/source), version-access, publisher, manager
src/modules/<m>/       *.service.ts (public API) · *.router.ts · *.repo.ts (private)
db/ddl/                numbered PostgreSQL DDL files, applied manually
```

How one course is generated, step by step: [`docs/HOW_GENERATION_WORKS.md`](../../docs/HOW_GENERATION_WORKS.md).

## Do / don't

- Router handlers call **services**; services never touch another module's repo/tables.
- New private procedure ⇒ owner-scoped lookup + cross-user **404** test.
- Enqueue inside the same DB transaction as the job row. Stage handlers are idempotent; assume at-least-once.
- Comments: a one- or two-line `//` only for what the code cannot say (RULES.md §2). No JSDoc, block comments or dividers.
- Shared counters: atomic SQL only (`UPDATE … WHERE used + n <= limit`).
- Never log keys/tokens/source; `platform/logger.ts` redacts but don't rely on it.
- Webhooks: verify HMAC on the **raw** body first (own encapsulated Fastify scope); oRPC lives in its own scope (its body parser is "leave untouched").
- `hijack()`ed responses (SSE) skip hooks — set CORS headers by hand and only for `PRODUCT_ORIGIN`.

## Status (see ROADMAP.md)

The code carries the implemented backend: config and logging, key vault, one DDL baseline, SSE, worker with checkpoint/retry/cancel, auth including account deletion, GitHub App install and listing, repositories, jobs, ingest and index, BYOK keys and catalogue, notifications, settings, search, dashboard, operator read endpoints, the generation pipeline and learning progress.

[`PRD.md`](../PRD.md) restructures the pipeline and data model: graph-first generation, the `course*` rename, snapshots instead of webhooks, no spend ledger, and the admin surface. R1–R3 in [`ROADMAP.md`](../ROADMAP.md) replace the affected modules; do not add code against the old stage names or a removed feature.

Still open: a worker-kill chaos run; live verification (GitHub App, real provider keys, live Google and GitHub sign-in, staging).
Rules for new code: grounding (`modules/pipeline/grounding`) stays pure, with no database or network access. Stages reach the database and the model only through the services and the LLM session they are given.
DB suites (`*.integration.test.ts`) run only with `TEST_DATABASE_URL` set to a disposable Postgres. They truncate shared tables, so parallel runs need separate databases. `vitest.config.ts` runs files serially for that reason.

## Commands

```bash
pnpm --filter @replo/api dev | dev:worker | test | typecheck | lint | build
pnpm --filter @replo/api db:setup
```
