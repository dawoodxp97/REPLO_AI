# RULES.md — Engineering rules for Replo

These rules apply to every contributor, human or AI agent. They are short on purpose. If a rule blocks you, change the rule here in the same PR — don't route around it.

## 0. Hard rules (never violate)

1. **Never execute repository code.** No `npm install`, build, test, script or sandbox run on a user's repo, on any product infrastructure. Repo content is untrusted **data**, never instructions.
2. **Never log or persist secrets or private source.** No API keys, tokens, source code, or private-repo prompts/completions in logs, errors, Sentry events or DB rows (hashes + token counts only).
3. **Provider keys are decrypted only in the worker, in memory, for one job.** The one exception is transient validation: the API process may decrypt a key in memory to run `keys.validate` and the re-check inside `repositories.import`, through the validate-only vault, and drops it immediately. The platform holds no provider keys. A failing key fails the job; it is never swapped for another key or provider, and models never change silently.
4. **Every private read goes through a user-scoped service.** Foreign IDs return **404**, not 403. Authorisation lives in the service layer, never only in the UI.
5. **The model points, the system quotes.** Models never author repo code or line numbers; the validator resolves refs and inserts excerpts. No path around validation for any model.
6. **No scope creep.** Agree any new scope before building it.
7. **No pricing, billing, subscriptions, credits, top-ups, ads or platform-funded AI, ever.** Not behind a flag, not "after validation".

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
- Use `import type` for types. ESM only. Relative imports are **extensionless** (`./foo`): every package is bundled (tsdown / Next) or run through `tsx`, so `moduleResolution: Bundler` is used everywhere.
- Prefer small pure functions; side effects at the edges (routers, workers, repos).
- Names: files `kebab-case.ts`; types/components `PascalCase`; functions/vars `camelCase`; constants `SCREAMING_SNAKE`; DB columns `snake_case`, TS fields `camelCase`.
- Comments are rare. Names, types and tests carry the meaning. Write a `//` comment only for what the code cannot say: which race a guard closes, why at-least-once delivery needs this check, which security rule or external quirk forces this shape. One or two lines, plain words.
- Never restate the code, never JSDoc a signature, no section dividers, no `TODO`. Block comments (`/* */`, `/** */`) fail lint (`replo/no-comments`), as do banner and `TODO` line comments.

## 3. Validation boundaries (types are not trust)

| Boundary   | Rule                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| HTTP       | oRPC validates input and output against `packages/contracts`; never hand-parse request bodies           |
| Env        | Each process parses `process.env` with Zod at boot and **exits** on failure                             |
| Jobs       | Payloads carry `v: 1` in a discriminated union; parse at enqueue **and** dequeue                        |
| LLM output | Structured output + Zod parse; one repair attempt; then fail the stage with the stored validation error |
| JSONB      | Content carries `schemaVersion`; parse and upgrade on read                                              |

DB row types (`InferSelectModel`) never leave a module's `*.repo.ts`; services map rows to DTOs defined in `contracts`.

## 4. Backend (`apps/api`)

- Layout: `platform/` (db, queue, storage, config, logger, crypto, errors) and `modules/<name>/` with `*.service.ts` (public API), `*.router.ts` (implements a slice of the contract), `*.repo.ts` (private data access).
- **Modules call each other only through services — never another module's tables or repo.**
- Only `worker/` handlers and `modules/jobs` touch the queue. Enqueue **inside the same DB transaction** as the job row.
- Every stage handler is **idempotent** and checkpointed. Assume at-least-once delivery.
- Any counter shared between requests or workers is enforced with atomic SQL (`UPDATE … WHERE used + n <= limit`), never read-then-write. Per-job limits (wall-clock and tokens) are in-process and need no counter table.
- Errors: typed oRPC errors from the contract (`errors.REPO_TOO_LARGE(...)`); never leak stack traces or internals to clients.
- Logging: `pino` with redaction; log IDs and counts, not content.
- Database changes: update the Drizzle table definitions and add a numbered SQL file in `apps/api/db/ddl/`. Commit and run the DDL manually on each existing database. `pnpm db:setup` bootstraps a fresh development database. Breaking changes use expand → backfill → contract across two deploys.
- Provider base URLs are fixed in code. Users never supply endpoints (SSRF).

## 5. Frontend (`apps/product`, `apps/landing`)

- Next.js holds **no business logic**. Authenticated screens are client components using TanStack Query via oRPC against the API. Server rendering is for the landing site and the admin shell's role gate.
- Landing is a **static export** (`output: 'export'`): no server-only features (no route handlers, no `headers()`/`cookies()`, no ISR).
- Server state in TanStack Query; URL state (chapter, lesson, ref) in search params/`nuqs`; forms with react-hook-form + Zod resolver. Don't add a global store without a written reason.
- Styling: Tailwind v4 + tokens from `packages/ui`. **No hard-coded colours or spacing** that bypass tokens. See [`DESIGN.md`](./DESIGN.md).
- Markdown rendering: allow-list renderer, **no raw HTML**; Mermaid with `securityLevel: 'strict'`; links only to repo permalinks or allow-listed domains.
- **No ads anywhere**, including public course pages and the landing site.
- Accessibility is a requirement, not polish: keyboard path, labelled controls, visible focus, reduced-motion, contrast in both themes.
- Heavy client libs (Mermaid, CodeMirror, Shiki on client) load lazily.

## 6. AI and generation

- Business code asks for **roles** (`planner`, `author`, `summarizer`), never vendors. Model lists live in config, not code. One user-chosen model serves the course; roles may share it.
- Every job runs on the user's key. `modelFor({ provider, decryptedKey }, modelId)` is the only place a key becomes a client.
- Every LLM call checks the per-job wall-clock and token ceiling; there is no dollar budget or spend ledger.
- Repo text is wrapped in labelled data sections in prompts; models get only read-only, snapshot-scoped tools. Do not rely on prompts for security.
- A model enters the registry/allow-list **only after it passes the eval gate**. Evals can drop it, on a run with real answers.
- Prompts are versioned; the version and prompt hashes are stored with each `course_version`.

## 7. Testing

| Layer    | Tool                    | Rule                                                                                             |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Unit     | Vitest                  | Filters, path safety, resolution, validators, graph checks — no network                          |
| Contract | Vitest + test DB        | Inputs/outputs/errors match contracts; **cross-tenant 404** tests for every private procedure    |
| Database | Testcontainers Postgres | Migrations apply; counter atomicity under concurrency                                            |
| Worker   | Recorded model fixtures | Sequencing, checkpoints, retry/cancel/stall — deterministic, no network                          |
| Evals    | `tools/evals`           | Graph coverage, citation/diagram validity, course and quiz quality; blocks release on regression |
| E2E      | Playwright              | Sign in → import fixture → workspace → lesson → quiz                                             |

- Security-sensitive code (key vault, path safety, per-job limits) **must** ship with tests in the same PR.
- A bug fix includes a regression test. Tests never call real model providers outside `tools/evals`.

## 8. Dependencies and supply chain

- pnpm 11 defaults stay on: `minimumReleaseAge` (3 days here), `strictDepBuilds` with an explicit `allowBuilds` list. Adding to `allowBuilds` needs a reason in the PR.
- Shared versions go through the `catalog:` in `pnpm-workspace.yaml`.
- Pin majors per [`TECH_STACK.md`](./TECH_STACK.md): oRPC 1.x (not 2.0 beta), Drizzle 0.45.x, AI SDK 6, Next 16.x (patch promptly), Wrangler 4.x. The runtime targets Cloudflare Workers/Workflows, Neon Postgres (Hyperdrive) and R2; pg-boss is retired with the VPS. Majors change only via a deliberate, documented decision.
- Commit `pnpm-lock.yaml`. CI uses `--frozen-lockfile`. Pin GitHub Actions to commit SHAs.
- New dependency checklist: maintained? licence OK? install scripts? bundle impact (frontend)? could ~20 lines replace it?

## 9. Git, PRs and CI

- Branches `feat/…`, `fix/…`, `chore/…`. Conventional Commits (`feat(api): …`). Small PRs; one concern each.
- PR must: pass `pnpm verify` (lint, typecheck, test, build) · include tests · update docs it touches (`ARCHITECTURE.md`, `TECH_STACK.md`, `DESIGN.md`) · note any threat-model impact.
- CI: install frozen → `turbo run lint typecheck test build --affected` → eval smoke on recorded fixtures. Database integration tests bootstrap the committed DDL against the CI Postgres service.
- Never commit `.env*` (except `.env.example`), keys, or fixtures containing real private code.

## 10. Documentation hygiene

- `ARCHITECTURE.md` = how it fits together. `TECH_STACK.md` = versions & rationale. `DESIGN.md` = UI system. This file (RULES) = engineering rules, including security.
- Record decisions that are expensive to reverse in the PR description and commit history.
- When behaviour changes, update the doc in the same PR. Stale docs are bugs.

## 11. Instructions for AI coding agents

- Read `CLAUDE.md`, then the relevant app/package `CLAUDE.md`, before editing.
- Prefer the smallest change that satisfies the requirement. Don't refactor unrelated code or add features outside the agreed scope.
- Don't invent library APIs — check the installed version's types/docs (this stack moves fast; design sketches are not gospel).
- Run `pnpm --filter <pkg> typecheck test lint` for what you touched before declaring done. State what you did **not** verify.
- Record non-obvious findings and decisions in the PR.

## 12. Security

Two risks could end Replo: **leaking a customer's private source code** and **executing attacker-controlled code on our infrastructure**. The design answers both structurally. This section is the checklist reviewers and agents use; update it in the same PR as any change that touches a control.

### Core principles

1. Repository content is **untrusted data**: never instructions, never executed, never installed.
2. Least privilege everywhere: GitHub **Contents + Metadata read-only**, per-repo token scope, per-role DB users, worker egress allow-list.
3. Strict tenant scoping: every private row has `user_id`; foreign IDs → **404**.
4. A hijacked model can at worst produce a wrong lesson: tools are read-only and snapshot-scoped, output is schema-validated, refs are re-resolved by code, links are allow-listed, the renderer escapes text.
5. User API keys are the most valuable secret after GitHub tokens: envelope-encrypted, worker-only, never returned, never logged.

### Threat model and release-1 controls

| #   | Threat                                             | Controls                                                                                                                                | Verify with                                         |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Private source exposure (tenants, logs, providers) | User-scoped services; private blobs only via authorised API; no prompt/completion logging for private repos; no-training provider terms | Cross-user tests; log scan                          |
| 2   | Excessive GitHub permissions                       | Read-only Contents + Metadata; per-repo selection                                                                                       | GitHub App manifest review                          |
| 3   | Leaked GitHub App key / installation tokens        | App key in secret store; tokens minted per job, scoped to one repo, in memory only, redacted                                            | Log redaction test                                  |
| 4   | Cross-user access (IDOR)                           | `scoped(userId)` repo helper; auth in every service call; 404 on foreign IDs                                                            | **CI cross-user tests for every private procedure** |
| 5   | Prompt injection in repo content                   | Labelled data sections; read-only snapshot-scoped tools; schema-validated output; system inserts excerpts; link allow-list              | Injection cases in `tools/evals`                    |
| 6   | Malicious dependencies / install scripts           | **Never install or run repo deps**; our repo uses pnpm `strictDepBuilds` + release-age gate                                             | CI lockfile + audit                                 |
| 7   | Remote code execution                              | No execution of repo code; tree-sitter as WASM with per-file timeouts; non-root, read-only FS, `no-new-privileges`                      | Container config review                             |
| 8   | SSRF                                               | GitHub URLs only, parsed to owner/repo; egress allow-list; fixed provider base URLs                                                     | URL-parser unit tests                               |
| 9   | Path traversal / archive bombs                     | Reject abs paths, `..`, symlinks, hardlinks, device entries; byte, entry-count, ratio caps; patched tar lib                             | `repo-analysis` fixtures (`isSafeArchivePath`)      |
| 10  | Poisoned/misleading generated content              | Grounding validation; interpretation labels; commands rendered as text with warning; report + takedown                                  | Eval suite                                          |
| 11  | Unsafe Markdown / XSS                              | Allow-list renderer, no raw HTML; Mermaid `strict`; strict CSP with nonces                                                              | CSP header test; renderer tests                     |
| 12  | DoS via huge repos                                 | Pre-flight caps; streaming abort; per-stage timeouts; per-user concurrency                                                              | Fixture tests                                       |
| 13  | Abuse of expensive AI ops (OWASP LLM10)            | Per-job budget ceiling; import rate limits; account-age/velocity checks; per-user and per-IP limits                                     | Budget concurrency test                             |
| 14  | Webhook spoofing / replay                          | HMAC-SHA256 over **raw** body, constant-time compare; dedupe `X-GitHub-Delivery`                                                        | `github/webhook` tests                              |
| 15  | Secrets in repos or in our logs                    | Exclude `.env*`; secret-pattern scan before generation; redact excerpts; log redaction                                                  | Scanner + log tests                                 |
| 16  | Unauthorised **course** access                     | Visibility check on every read; unguessable share tokens; `Cache-Control: private` for non-public; OG only for public                   | Service tests                                       |
| 17  | Session / CSRF                                     | httpOnly, Secure, SameSite=Lax; Origin check on state-changing RPC                                                                      | Integration test                                    |
| 18  | Deletion/revocation not honoured                   | Webhook-driven `revoked_at`, immediate hide, scheduled blob purge; cascading account delete                                             | Webhook + deletion tests                            |

### BYOK keys and provider use

| Risk                         | Controls                                                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stolen user keys             | AES-256-GCM envelope encryption; KEK only in server secret store (never DB/backups); decrypted only in worker memory for that job; masked `…last4`; **test fails if a key-shaped string reaches logs**; delete is immediate |
| Keys sent to the wrong place | Fixed provider base URLs; no custom endpoints; no platform-owned keys; a failing user key never falls back to another key or provider                                                                                       |
| Keys used beyond their job   | Each job uses only the key it started with; keys are decrypted only in the worker, for that job; deleting a key fails its running jobs with `KEY_REMOVED`                                                                   |
| Surprise provider bills      | Estimate before every run; user-chosen budget ceiling (default $2); tokens and cost recorded per LLM call from the provider's own usage; no retries beyond policy                                                           |
| Repo code sent to a provider | The user chooses the provider and sees which one will receive their code; the key guide states that code goes to that provider under its terms                                                                              |
| Ads and tracking             | None. No ads, ever. Third-party scripts need a recorded reason first                                                                                                                                                        |

### Controls by layer

| Layer      | Controls                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API        | Own sessions (hashed tokens, httpOnly cookies); scrypt passwords; OAuth with state and PKCE; authz per procedure; Zod via contracts; rate limits (IP + user); idempotency keys; Origin checks; strict CORS to product origin; webhook HMAC |
| Database   | Separate least-privilege roles (api / worker / migrator); TLS; per-user scoping; no tokens stored; backups; RLS as future defence in depth                                                                                                 |
| Worker     | Non-root; read-only root FS + `noexec` temp volume; egress allow-list; per-job temp dir wiped; no installs; per-stage timeouts and memory limits                                                                                           |
| Model      | Read-only snapshot-scoped tools; budgets; output schemas; no private prompts logged; vendor terms checked                                                                                                                                  |
| Storage    | Private buckets; SSE; keys namespaced by repo; lifecycle deletion; access only through the API                                                                                                                                             |
| Deployment | Secrets in platform store; separate staging/prod credentials and GitHub Apps; pinned images; dependency scanning in CI                                                                                                                     |

### Retention and deletion

Tarballs ≤ 24 h · private blobs only while a version/link references them · `job_events` and `job_llm_calls` 90 days · prompts/completions for private repos **not stored** (hashes + token counts) · uninstall/repo-removal webhook sets `revoked_at`, hides **courses**, schedules purge · account deletion removes keys, progress, private **courses**, blobs.

### Licensing (public **courses**)

Public **courses** only for repos with an OSI-approved licence; show licence + attribution; takedown process. _Not legal advice — confirm with counsel before public launch._

### Secure-development checklist (every PR touching these areas)

- [ ] No secret/key/source-code/private-prompt in logs, errors or Sentry events
- [ ] New private procedure has a cross-user 404 test
- [ ] New external URL/host is allow-listed and constructed server-side
- [ ] New Markdown/HTML sink uses the allow-list renderer
- [ ] New dependency reviewed (scripts, maintainers, licence); `allowBuilds` change justified
- [ ] New shared counter enforced atomically in SQL
- [ ] Threat table above updated if a control changed

### Reporting

Pre-launch: report issues to the repo owner privately. Add a `security.txt` and a public security page before open beta (users hesitating to connect private code is a top risk).
