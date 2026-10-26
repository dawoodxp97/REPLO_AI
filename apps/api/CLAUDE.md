# apps/api — CLAUDE.md

Fastify 5 + oRPC + own auth (`modules/identity`) + Drizzle + pg-boss. Two processes from one package. Rules: root `RULES.md` §3–§4. Requirements: `PRD.md` §4–§5.

## Layout

```
src/main.http.ts     HTTP server: helmet, cors(PRODUCT_ORIGIN), rate-limit, /healthz /readyz, auth, webhook, SSE, /rpc/*
src/main.worker.ts   pg-boss worker + reaper + :4001/healthz
src/orpc.ts          `os` (base) and `authed` builders — implement(contract)
src/router.ts        composes module routers
src/context.ts       RequestContext + Services
src/jobs/            payload schemas (versioned), error classification, generate-tutorial handler
src/platform/        config (Zod env), db (schema, client, migrate), logger (redaction), crypto/key-vault, errors, http types
src/modules/<m>/     *.service.ts (public API) · *.router.ts · *.repo.ts (private)
drizzle/             generated SQL migrations (commit; review)
```

## Do / don't

- Router handlers call **services**; services never touch another module's repo/tables.
- New private procedure ⇒ owner-scoped lookup + cross-user **404** test.
- Enqueue inside the same DB transaction as the job row. Stage handlers are idempotent; assume at-least-once.
- Shared counters: atomic SQL only (`UPDATE … WHERE used + n <= limit`).
- Never log keys/tokens/source; `platform/logger.ts` redacts but don't rely on it.
- Webhooks: verify HMAC on the **raw** body first (own encapsulated Fastify scope); oRPC lives in its own scope (its body parser is "leave untouched").
- `hijack()`ed responses (SSE) skip hooks — set CORS headers by hand and only for `PRODUCT_ORIGIN`.

## Status (see ROADMAP.md)

✅ env/config, logger redaction, key vault, schema + migrations `0000`–`0008`, webhook HMAC + dedupe (installation, repository and push events), SSE route, worker with checkpoint/retry/cancel, `me.get`, `me.deleteAccount` (public-tutorial choice), GitHub App install and listing, `repositories.preflight|list|import|estimate|remove`, `jobs.get|cancel|retry`, ingest and index stages, BYOK keys and model catalogue, notifications writer and reader, settings, search, dashboard, operator read endpoints.
✅ generation pipeline (B6): summaries, architecture, outline, lessons, validate, publish; checkpoints in `job_stage_outputs`; grounding and one repair per lesson (B7); tutorial library, visibility, share links, delete, report (B8); learning progress, history, quiz (B8).
✅ unread count over `GET /notifications/stream`; 90-day notification purge; a procedure-wide cross-user sweep (`router.cross-user.integration.test.ts`).
🟡 still open: a worker-kill chaos run; live verification (GitHub App deliveries, real provider keys, live Google and GitHub sign-in, staging).
Rules for new code: grounding (`modules/pipeline/grounding`) stays pure, with no database or network access. Stages reach the database and the model only through the services and the LLM session they are given.
DB suites (`*.integration.test.ts`) run only with `TEST_DATABASE_URL` set to a disposable Postgres. They truncate shared tables, so parallel runs need separate databases. `vitest.config.ts` runs files serially for that reason.

## Commands

```bash
pnpm --filter @replo/api dev | dev:worker | test | typecheck | lint | build
pnpm --filter @replo/api db:generate | db:migrate | db:check-drift
```
