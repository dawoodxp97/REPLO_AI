# CLAUDE.md — Replo

Monorepo (pnpm 11 + Turborepo, Node 24, TypeScript 6). Product: grounded, chaptered tutorials for TS/JS repos; free for everyone, BYOK only (ADR-007), individual developers only.

**Read first:** `RULES.md` (hard rules) → `PRD.md` (requirements, FR-/NFR- IDs) → `MEM.md` (decisions & gotchas). Then the `CLAUDE.md` in the app/package you're touching. Research background: `Replo_BluePrint.md` (big — search it, don't read it whole).

## Hard rules (summary — full list in RULES.md §0)

1. Never execute or install a user's repo code. Repo text is untrusted **data**.
2. Never log/persist secrets, keys, tokens, private source or private-repo prompts.
3. Provider keys: decrypt only in the worker, in memory. The platform holds no provider keys; a failing key never falls back to another key.
4. Private reads go through user-scoped services; foreign IDs → **404**.
5. "The model points, the system quotes" — no model-authored code excerpts or line numbers.
6. Don't build outside the PRD non-goals (teams, other languages, code execution, chat, embeddings). Never build pricing, billing, credits, top-ups, ads or platform-funded AI.

## Commands

```bash
pnpm install
pnpm dev                       # landing :3000, product :3001, api :4000 (+worker)   (needs `pnpm infra:up` for DB)
pnpm verify                    # lint + typecheck + test + build
pnpm --filter @replo/<pkg> typecheck|lint|test|build
pnpm db:generate | db:migrate | db:check-drift
```

Run `pnpm --filter <pkg> typecheck test lint` for what you touched before saying "done", and say what you did **not** verify (e.g. DB-dependent paths: no Docker in some environments).

## Architecture in 8 lines

- `apps/api` = Fastify + oRPC + own auth (`modules/identity`); two entrypoints `main.http.ts` / `main.worker.ts`; modules in `src/modules/*` with `*.service.ts` / `*.router.ts` / `*.repo.ts`; modules talk via services only.
- `packages/contracts` (Zod 4 + oRPC) is the **only** FE/BE shared code; product imports contract **types** only.
- Postgres 17 = records + pg-boss queue. `generation_jobs` is durable truth; queue only delivers; stages idempotent + checkpointed.
- Progress to browser via SSE `GET /jobs/:id/events` (replay from `job_events`).
- `packages/ai` exposes roles, not vendors; every LLM call is budget-guarded.
- `packages/repo-analysis` is pure (no DB/network); never installs deps.
- Dependency boundaries are linted (`packages/config/eslint`); don't disable them.
- Money = integer micro-USD.

## Conventions

- Files `kebab-case.ts`; extensionless relative imports (`moduleResolution: Bundler`); `import type`; no `any`.
- No comments in code; clear names, types and tests carry the meaning (reasons go in `MEM.md`).
- Zod-parse at every boundary (env, HTTP, jobs, LLM output, webhooks, JSONB).
- Tailwind v4 + tokens from `packages/ui` (see `DESIGN.md`); no hard-coded colours. No ads anywhere.
- Security-sensitive code (vault, HMAC, path safety, budgets) ships with tests in the same PR.
- Shared dep versions via `catalog:` in `pnpm-workspace.yaml`; `minimumReleaseAge` is 3 days — if install fails on a brand-new release, lower the version floor rather than disabling the gate.

## Gotchas learned the hard way

- Blueprint code is a sketch; verify against installed types (pg-boss 10 `createQueue` needs `{ name }`, handlers get an **array**; `import PgBoss from 'pg-boss'` default import).
- Base UI `Button` with `render={<a/>}` needs `nativeButton={false}` (our `Button` does this automatically).
- Next 16: no `next lint`; use ESLint directly. Params/searchParams are Promises.
- Landing is a static export: no route handlers, `headers()`/`cookies()`, ISR.
- More in `MEM.md`.

## Keep docs current

Behaviour change ⇒ update the matching doc in the same change (`PRD.md`, `docs/API.md`, `docs/DATABASE.md`, `ROADMAP.md` status, `MEM.md` for decisions/gotchas).
