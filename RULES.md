# RULES.md — Engineering rules for Replo

These rules apply to every contributor, human or AI agent. They are short on purpose. If a rule blocks you, change the rule here in the same PR — don't route around it. Rationale lives in [`PRD.md`](./PRD.md) and [`Replo_BluePrint.md`](./Replo_BluePrint.md).

## 0. Hard rules (never violate)

1. **Never execute repository code.** No `npm install`, build, test, script or sandbox run on a user's repo, on any product infrastructure. Repo content is untrusted **data**, never instructions.
2. **Never log or persist secrets or private source.** No API keys, tokens, source code, or private-repo prompts/completions in logs, errors, Sentry events or DB rows (hashes + token counts only).
3. **Provider keys are decrypted only in the worker, in memory, for one job.** The platform holds no provider keys. A failing key fails the job; it is never swapped for another key or provider, and models never change silently (ADR-007).
4. **Every private read goes through a user-scoped service.** Foreign IDs return **404**, not 403. Authorisation lives in the service layer, never only in the UI.
5. **The model points, the system quotes.** Models never author repo code or line numbers; the validator resolves refs and inserts excerpts. No path around validation for any model.
6. **No scope creep past the PRD Non-goals** (teams/roles, other languages, code execution, chat, embeddings…). Propose in `MEM.md` first.
7. **No pricing, billing, subscriptions, credits, top-ups, ads or platform-funded AI, ever** (ADR-007). Not behind a flag, not "after validation".

## 1. Repository and dependency graph

```
apps/product ─▶ contracts, ui          apps/api ─▶ contracts, ai, repo-analysis
apps/landing ─▶ ui                     tools/evals ─▶ ai, repo-analysis, contracts
```

- No package imports an app. `contracts`, `ui`, `ai`, `repo-analysis`, `config` import **no other internal package**.
- Frontends **never** import `@replo/ai`, `@replo/repo-analysis` or anything under `apps/api`. The product app imports only the contract's **type** for its client.
- `packages/ui` = primitives + tokens only. Product composites (`LearningPlayer`, `SourcePanel`, `OutlineTree`) live in `apps/product`.
- These are enforced by ESLint `no-restricted-imports` (see `packages/config/eslint`). Don't disable it.
- Shared packages export TypeScript **source** (`"exports": {".": "./src/index.ts"}`); Next transpiles them via `transpilePackages`; the API is bundled with workspace deps inlined.
- Package scope is `@replo/*`.

## 2. TypeScript

- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `isolatedModules`. No `any` (use `unknown` + Zod). No `// @ts-ignore` (use `@ts-expect-error` with a reason).
- Avoid options deprecated in TS 6.0 so the TS 7 native compiler is a drop-in.
- Use `import type` for types. ESM only. Relative imports are **extensionless** (`./foo`): every package is bundled (tsdown / Next) or run through `tsx`, so `moduleResolution: Bundler` is used everywhere (see `MEM.md` D-004).
- Prefer small pure functions; side effects at the edges (routers, workers, repos).
- Names: files `kebab-case.ts`; types/components `PascalCase`; functions/vars `camelCase`; constants `SCREAMING_SNAKE`; DB columns `snake_case`, TS fields `camelCase`.
- No comments in code. Names, types and tests carry the meaning; reasons go in `MEM.md` (D-064).

## 3. Validation boundaries (types are not trust)

| Boundary   | Rule                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| HTTP       | oRPC validates input and output against `packages/contracts`; never hand-parse request bodies           |
| Env        | Each process parses `process.env` with Zod at boot and **exits** on failure                             |
| Jobs       | Payloads carry `v: 1` in a discriminated union; parse at enqueue **and** dequeue                        |
| LLM output | Structured output + Zod parse; one repair attempt; then fail the stage with the stored validation error |
| Webhooks   | Verify signature on the **raw** body first, then minimal schema parse                                   |
| JSONB      | Content carries `schemaVersion`; parse and upgrade on read                                              |

DB row types (`InferSelectModel`) never leave a module's `*.repo.ts`; services map rows to DTOs defined in `contracts`.

## 4. Backend (`apps/api`)

- Layout: `platform/` (db, queue, storage, config, logger, crypto, errors) and `modules/<name>/` with `*.service.ts` (public API), `*.router.ts` (implements a slice of the contract), `*.repo.ts` (private data access).
- **Modules call each other only through services — never another module's tables or repo.**
- Only `jobs/` handlers and `modules/generation` touch the queue. Enqueue **inside the same DB transaction** as the job row.
- Every stage handler is **idempotent** and checkpointed. Assume at-least-once delivery.
- Any counter shared between requests or workers is enforced with atomic SQL (`UPDATE … WHERE used + n <= limit`), never read-then-write. The per-job budget (`Budget`) is in-process and needs no counter table.
- Errors: typed oRPC errors from the contract (`errors.REPO_TOO_LARGE(...)`); never leak stack traces or internals to clients.
- Logging: `pino` with redaction; log IDs and counts, not content.
- Migrations: `drizzle-kit generate` → commit reviewed SQL → applied by the one-off `migrate` step **before** new code rolls out. Breaking changes use expand → backfill → contract across two deploys. `drizzle-kit push` only on local/preview DBs.
- Provider base URLs are fixed in code. Users never supply endpoints (SSRF).

## 5. Frontend (`apps/product`, `apps/landing`)

- Next.js holds **no business logic**. Authenticated screens are client components using TanStack Query via oRPC against the API. Server rendering is for **public tutorial pages** and the landing site.
- Landing is a **static export** (`output: 'export'`): no server-only features (no route handlers, no `headers()`/`cookies()`, no ISR).
- Server state in TanStack Query; URL state (chapter, lesson, ref) in search params/`nuqs`; forms with react-hook-form + Zod resolver. Don't add a global store without a written reason.
- Styling: Tailwind v4 + tokens from `packages/ui`. **No hard-coded colours or spacing** that bypass tokens. See [`DESIGN.md`](./DESIGN.md).
- Markdown rendering: allow-list renderer, **no raw HTML**; Mermaid with `securityLevel: 'strict'`; links only to repo permalinks or allow-listed domains.
- **No ads anywhere**, including public tutorial pages and the landing site (ADR-007).
- Accessibility is a requirement, not polish: keyboard path, labelled controls, visible focus, reduced-motion, contrast in both themes.
- Heavy client libs (Mermaid, CodeMirror, Shiki on client) load lazily.

## 6. AI and generation

- Business code asks for **roles** (`planner`, `author`, `summarizer`, `judge`), never vendors. Prices and model lists live in config, not code.
- Every job runs on the user's key. `modelFor({ provider, decryptedKey }, modelId)` is the only place a key becomes a client.
- Every LLM call: `budget.reserve` before, `budget.settle` after; record in `llm_calls`.
- Repo text is wrapped in labelled data sections in prompts; models get only read-only, snapshot-scoped tools. Do not rely on prompts for security.
- A model enters the registry/allow-list **only after it passes the eval gate**. Evals can drop it, on a run with real answers (MEM D-048).
- Prompts are versioned; the version and prompt hashes are stored with each `tutorial_version`.

## 7. Testing

| Layer    | Tool                    | Rule                                                                                          |
| -------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| Unit     | Vitest                  | Filters, path safety, resolution, validators, cost math — no network                          |
| Contract | Vitest + test DB        | Inputs/outputs/errors match contracts; **cross-tenant 404** tests for every private procedure |
| Database | Testcontainers Postgres | Migrations apply; counter atomicity under concurrency                                         |
| Worker   | Recorded model fixtures | Sequencing, checkpoints, retry/cancel/stall — deterministic, no network                       |
| Evals    | `tools/evals`           | Grounding, coverage, fabrication, cost; blocks release on regression                          |
| E2E      | Playwright              | Sign in → import fixture → progress → lesson → quiz → share                                   |

- Security-sensitive code (key vault, HMAC, path safety, budgets) **must** ship with tests in the same PR.
- A bug fix includes a regression test. Tests never call real model providers outside `tools/evals`.

## 8. Dependencies and supply chain

- pnpm 11 defaults stay on: `minimumReleaseAge` (3 days here), `strictDepBuilds` with an explicit `allowBuilds` list. Adding to `allowBuilds` needs a reason in the PR.
- Shared versions go through the `catalog:` in `pnpm-workspace.yaml`.
- Pin majors per [`TECH_STACK.md`](./TECH_STACK.md): oRPC 1.x (not 2.0 beta), Drizzle 0.45.x, AI SDK 6, pg-boss 10.x, Next 16.x (patch promptly). Majors change only via an entry in `MEM.md`.
- Commit `pnpm-lock.yaml`. CI uses `--frozen-lockfile`. Pin GitHub Actions to commit SHAs.
- New dependency checklist: maintained? licence OK? install scripts? bundle impact (frontend)? could ~20 lines replace it?

## 9. Git, PRs and CI

- Branches `feat/…`, `fix/…`, `chore/…`. Conventional Commits (`feat(api): …`). Small PRs; one concern each.
- PR must: pass `pnpm verify` (lint, typecheck, test, build) · include tests · update docs it touches (`PRD.md`, `docs/*`, `MEM.md`) · note any threat-model impact.
- CI: install frozen → `turbo run lint typecheck test build --affected` → migration drift check → eval smoke on recorded fixtures.
- Never commit `.env*` (except `.env.example`), keys, or fixtures containing real private code.

## 10. Documentation hygiene

- `PRD.md` = what & why (requirements). `ARCHITECTURE.md` = how it fits together. `TECH_STACK.md` = versions & rationale. `DESIGN.md` = UI system. `SECURITY.md` = threats & controls. `ROADMAP.md` = phases. `MEM.md` = decisions, assumptions and gotchas log.
- Decisions that are expensive to reverse get an ADR (`docs/adr/NNN-title.md`).
- When behaviour changes, update the doc in the same PR. Stale docs are bugs.

## 11. Instructions for AI coding agents

- Read `CLAUDE.md`, then the relevant app/package `CLAUDE.md`, before editing.
- Prefer the smallest change that satisfies the requirement ID. Don't refactor unrelated code or add features outside the PRD.
- Don't invent library APIs — check the installed version's types/docs (this stack moves fast; blueprint code is a sketch, not gospel).
- Run `pnpm --filter <pkg> typecheck test lint` for what you touched before declaring done. State what you did **not** verify.
- Record non-obvious findings and decisions in `MEM.md`.
