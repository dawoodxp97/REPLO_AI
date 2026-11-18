# ROADMAP.md

Release 1 plan. Requirements: [`PRD.md`](./PRD.md). Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md). Decisions: [`MEM.md`](./MEM.md).

## Shape of the plan

One sequence, contract first. The backend contract and data model land before code depends on them; the product is built against a finished API; the admin surface and evals follow; deploy and hardening close the release.

| Phase  | Scope                                                                                                       | Size | Depends on |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---- | ---------- |
| **R0** | Spec, decisions and rules aligned                                                                           | S    | —          |
| **R1** | Contracts + DDL: `course*` rename, graph/diagram/analytics/admin schemas, removed tables/columns            | L    | R0         |
| **R2** | API surface: every PRD §8 procedure, timeouts, SSE, cross-user 404                                          | L    | R1         |
| **R3** | Pipeline: index → enrich → graph-review → tours → diagrams → outline → lessons → validate → publish         | XL   | R1, R2     |
| **R4** | Product UI: workspace, course player, dashboard, repositories/courses, search, active generations, settings | XL   | R2, R3     |
| **R5** | Admin UI and operator jobs/queues view                                                                      | L    | R2         |
| **R6** | Landing: static, no demo                                                                                    | S    | R0         |
| **R7** | Evals: graph, citation, diagram, course and quiz gates                                                      | L    | R3         |
| **R8** | Documentation and dead-code sweep                                                                           | M    | R1–R7      |
| **R9** | Cloudflare migration (Workers/Workflows/Neon), full CI/CD on GitHub Actions, release hardening              | XL   | R1–R8      |

Estimate, two engineers: **~17–21 weeks** (R9 grew to XL for the Cloudflare migration). R5 and R6 can run beside R3/R4; R7 starts when the pipeline can produce fixtures.

**Critical path:** R0 → R1 → R2 → R3 → R4 → R7 → R8 → R9.

**Definition of done per phase:** merged behind tests · typecheck and lint clean · migrations apply to a fresh database and upgrade the previous one · the phase's Playwright/API/eval checks pass · touched docs updated (`PRD`, `ARCHITECTURE`, `docs/API`, `docs/DATABASE`, `MEM`) · no open critical threat-model item for the phase.

Status legend: `[x]` done · `[~]` scaffolded · `[ ]` not started.

---

## R0 — Spec, decisions and rules (S) — `[x]`

- [x] `PRD.md` current plan: accounts, import, keys/models, graph-first generation, grounding, workspace, course player, dashboard, search, active generations, notifications, settings, admin.
- [x] `MEM.md` D-111–D-122: product shape, graph-first pipeline, deterministic grounding, snapshots, vault, one model per course, analytics, admin, course term, product-wide search, evals, static landing.
- [x] `RULES.md` aligned: no webhook, budget, ledger, sharing or non-goal language; eval gate and E2E journey updated.
- [x] `ARCHITECTURE.md`, `TECH_STACK.md` aligned.
- [x] Historical work docs removed; remaining docs do not describe the plan as a rewrite.
- **Accept:** the five contract docs agree; no version or rewrite framing; a reader can build from PRD §4–§8 alone.

## R1 — Contracts and data (L) — `[x]`

**Contracts (`packages/contracts`)**

- [x] Rename `tutorial*` → `course*` in schemas, types, errors and procedure names.
- [x] Rename the contract key to `courses` and the routes to `/courses` and `/course-versions`.
- [x] Add `CourseContent` v2: `graph`, `tours`, `diagrams`, `chapters → lessons → blocks (+ quiz)`, `sourceRefs`, `openQuestions`; upcast v1 on read.
- [x] Add `DiagramSpec` union (architecture, tree, class, ERD, sequence, workflow, dataflow, lifecycle) with ≤ 3 refs per node/edge.
- [x] Add `GraphNode`, `GraphEdge`, `Tour`, `AnalyticsQuery`, `SavedDashboard`, `AdminSummary` schemas.
- [x] Remove sharing, visibility, budget/spend and webhook schemas.

**Database (`apps/api/db/ddl`)**

- [x] One expand→backfill→contract set (`0001`–`0003`): rename `tutorials`, `tutorial_versions`, `tutorial_source_refs`, `tutorial_lessons`, `tutorial_reports`; rename the foreign keys and indexes.
- [x] Add `diagram_specs`.
- [x] Add `saved_dashboards`, `analytics_events`; add `repository_snapshots.graph` JSONB; add `user.role`.
- [x] Drop `webhook_deliveries`, `repo_push_events`, `job_llm_calls`, spend/budget columns and visibility/share columns.
- [x] Indexes: `pg_trgm` on dashboard names and course/repo titles; FTS on lesson titles and file paths; `(user_id, occurred_at)` on events.
- **Accept:** fresh DB applies; previous DB upgrades; drizzle drift check passes; cross-user and cascade tests pass.

## R2 — API surface (L) — `[x]`

- [x] `auth.*` without revoke-other-sessions; `me.{get,deleteAccount}`; `github.{installUrl,listRepos}`.
- [x] `keys.*` vault-only; `models.{catalog,getPreferences,setPreferences}` with a default model.
- [x] `repositories.{preflight,import,list,remove,rerun}` — no webhook route.
- [x] `jobs.{get,listActive,cancel,retry}`; SSE `/jobs/:id/events`.
- [x] `courses.{list,get,getChapter,getSource,delete}`; `workspace.{graph,node,diagram,tree}`.
- [x] `learning.*`, `search.all`, `dashboard.*` (summary, recent, analytics, save, listDashboards, deleteDashboard), `notifications.*`, `settings.*`.
- [x] `admin.*` behind the role gate.
- **Accept:** every PRD §8 procedure has contract tests; cross-user 404 on every private read; removed procedures are gone; no endpoint exposes keys, prompts or private source.

## R3 — Pipeline (XL) — `[x]`

- [x] Stages: `ingest → index → enrich → graph-review → tours → diagrams → outline → lessons → validate → publish`; each idempotent and checkpointed.
- [x] `index`: tree-sitter structural graph (files, symbols, imports, calls, extends/implements, modules).
- [x] `enrich`: batched summaries, layers, domains, flows, concepts; central-file ordering; checkpoint per batch.
- [x] `graph-review`: coverage and referential integrity; one repair pass.
- [x] `tours`: dependency-ordered paths with objectives and steps.
- [x] `diagrams`: system-built architecture/tree/class/ERD; model-authored sequence/workflow/dataflow/lifecycle; every node/edge validated.
- [x] `outline`, `lessons`, `validate`: graph-anchored lessons; model points, system quotes; one repair; draft label on low coverage.
- [x] Rerun lineage: fresh snapshot, new version, previous version preserved; stable keys carry progress.
- [x] Remove judge, budget/settle, `job_llm_calls` and preset resolution; add wall-clock/token limits.
- **Accept:** end-to-end on golden fixtures; 100% of refs and diagram edges resolve; crash/retry/cancel proven; lite path on a small repo and a free model.

## R4 — Product UI (XL)

- [x] **Workspace**: graph (layer-grouped), tree and table views; node detail; tours; diagram viewer with evidence chips.
- [x] **Course player**: lesson + pinned source, keyboard, command palette, quizzes, progress, resume; no share/visibility controls.
- [x] **Repositories / Courses**: counts, status, last activity, cascade delete; no "My" wording.
- [x] **Dashboard**: analytics cards, charts, day/week/month timelines, saved dashboards with filters.
- [x] **Search**: one box across repositories, courses, lessons, files and saved dashboards.
- [x] **Active generations**: live list with stage, progress, elapsed and cancel.
- [x] **Settings**: default model, audience, theme, quiz/auto-advance/browser notification preferences; account deletion with typed confirmation.
- [x] Remove sharing, visibility, preset/budget and revoke-sessions UI.
- **Accept:** Playwright `sign in → import → workspace → lesson → quiz`; analytics and saved dashboards work at all three granularities; axe ≥ 90 on player and workspace.

## R5 — Admin (L)

- [x] Role-gated route group and shell; server-side check before the client renders.
- [x] Overview: users, repositories, generations, storage, error rates.
- [x] Jobs: all users, filters, stage timings, error codes; queues and cron schedules.
- [x] Metadata only — no keys, prompts or source.
- **Accept:** non-admin gets 404/redirect before shell; admin sees every user's job; gate has cross-user tests.

## R6 — Landing (S) — `[x]`

- [x] Static export only; no API calls, live data or demo course component.
- [x] Product, graph/diagram experience, BYOK key guide and policy pages.
- **Accept:** static build; Lighthouse a11y ≥ 90; no demo fixtures remain.

## R7 — Evals (L) — `[x]`

- [x] Golden repositories with truth sheets (small/medium/large; TS/JS and mixed).
- [x] Metrics: graph coverage, citation validity (100%), diagram validity (100%), course coherence, quiz quality, latency, tokens.
- [x] Per-model matrix including OpenRouter `:free`; CI thresholds; stored artefacts.
- [x] Every allow-listed model passes before it is offered.
- **Accept:** CI blocks a regression; a weak model is rejected; a good model is admitted on the same fixtures.

## R8 — Documentation and dead-code sweep (M)

- [x] `docs/API.md`, `docs/DATABASE.md`, `docs/HOW_GENERATION_WORKS.md` rewritten to the current system.
- [x] Remove stale feature references from `SECURITY.md`, `DESIGN.md`, `README.md`, code comments and landing copy.
- [x] Delete dead modules, tables, contracts and fixtures left by removed features.
- **Accept:** `grep` finds no reference to a removed feature; docs match code; no unused exports or tables.

## R9 — Cloudflare migration, CI/CD and release hardening (XL)

Everything hosts on Cloudflare: Workers for compute, Neon Postgres behind Hyperdrive for data, R2 for blobs, Workflows for the pipeline, GitHub Actions for CI/CD. The VPS, Docker Compose, Caddy and pg-boss are retired.

**Platform migration**

- [x] API: Fastify 5 runs on a Worker via `cloudflare:node` `httpServerHandler` (`nodejs_compat` on by default, compatibility date ≥ 2026-08-04); `pluginTimeout: 0`; static files never served by Fastify; `/healthz` `/readyz` work as-is; CPU limit raised to 5 min in `wrangler.jsonc` (`limits.cpu_ms`).
- [~] Product: `@opennextjs/cloudflare` (v1.20+, Next.js 16, Node runtime, no `edge` routes); R2 incremental cache + D1 tag cache bindings; admin SSR role gate unchanged; custom domains via Wrangler routes.
- [~] Landing: static export to Workers Static Assets (Pages only if the export path demands it); no API calls.
- [~] Postgres: Neon (serverless Postgres 17, scale-to-zero) + Hyperdrive binding; `pg` driver and Drizzle unchanged; pooling mode = transaction; Hyperdrive user is a dedicated Neon role with pooled connections disabled.
- [~] Blobs: R2 bindings replace the S3 client; tarballs, git-blob objects and nightly backups in the same buckets; local dev keeps MinIO behind a driver switch.
- [ ] Secrets: Wrangler secrets / account env vars for `KEY_ENCRYPTION_KEY`, GitHub App key, OAuth client secrets; `AUTH_COOKIE_DOMAIN` and origins set per environment.
- [x] Rewrite `ARCHITECTURE.md` §2 runtime topology and `TECH_STACK.md` hosting rows to this platform before merge (docs match the system).

**Pipeline on Workflows (pg-boss retired)**

- [~] `generation_jobs` stays the durable truth; each course generation creates a **Cloudflare Workflow instance** (`CourseGenerationWorkflow`) whose step wraps the checkpointed stage loop (`ingest → … → publish`) — completed stages are skipped on retry by the existing checkpoints, so one durable step per run is equivalent to one step per stage; `wrangler.pipeline.jsonc` carries the `generate-course` Workflow and the `replo-pipeline` worker.
- [~] `ingest`/`index` in-isolate: tar extraction to an in-memory VFS, tree-sitter WASM parse; pre-flight caps (`MAX_REPO_FILES`, `MAX_REPO_BYTES`) are the memory guard — refuse before any bytes are fetched, stream GitHub → VFS without buffering the whole tarball where possible.
- [~] Retry policy moves to Workflows (step retries with exponential backoff = the old pg-boss retryLimit/retryDelay, error classification reused); cancel = `canceling` flag observed by the heartbeat (unchanged); heartbeat/reaper logic collapses into Workflows' persisted state.
- [~] SSE `/jobs/:id/events` unchanged (streaming responses, no duration limit on HTTP); event rows still written per stage, reconnect via `Last-Event-ID` still works.
- [~] Cron Triggers replace the reaper/retention/purge workers: dispatch backstop sweep (every minute), stalled-job sweep, retention purge (nightly, ≤ 15 min CPU/wall per trigger).
- [x] One active job per user enforced at enqueue time (instance id = job id; the sweep only creates missing instances); evals still gate every allow-listed model before it is offered.

**CI/CD on GitHub Actions (automatic hosting)**

- [x] PR checks: frozen install → `turbo run lint typecheck test build --affected` (Testcontainers boot Neon-compatible DDL against a local Postgres) → eval smoke on recorded fixtures.
- [~] PR previews: `wrangler versions upload` per PR on a `*.workers.dev` preview URL — product, api and landing all deployable; product Playwright suite runs against the preview when the PR touches `apps/product` or `apps/api`.
- [~] Main → production, automatic: build → `opennextjs-cloudflare build` → deploy via `wrangler-action` (plain `wrangler deploy` today; **staged rollout** via `versions upload`/`versions deploy` is the documented follow-up in `deploy.yml`) → smoke checks against production; instant rollback = redeploy the previous version. Actions pinned to SHAs; Cloudflare does not support GitHub OIDC federation, so deploys authenticate with a scoped API token (`CLOUDFLARE_API_TOKEN` secret, Workers Scripts:Edit + D1:Edit + Hyperdrive:Edit + R2:Edit).
- [x] DDL: migration step applies the committed numbered DDL files (`apps/api/scripts/apply-ddl.ts`, `_schema_migrations` ledger + advisory lock, verified idempotent) to Neon (fresh-branch test first via Neon branching) **before** the code rollout step; drift check blocks the merge if it fails.
- [~] Secrets and Hyperdrive configs provisioned by a `wrangler deploy` of `wrangler.jsonc` (envs: `production`, `preview`); `NEXT_PUBLIC_*` baked at build time from repo config, not the dashboard.

**Hardening and go-live**

- [ ] Nightly encrypted backups to R2 (pg_dump from Neon → R2 with SSE; R2 lifecycle rules), plus Neon PITR enabled; monthly restore drill documented and rehearsed once before go-live.
- [ ] Alerts: generation failure rate > 20%/h, oldest queued workflow age > 15 min, Neon storage, backup failed, key-validation failure spike (Workers cron alert worker + Sentry).
- [ ] Live GitHub App, live Google/GitHub sign-in, a real provider key end to end on the deployed stack.
- [ ] Threat-model checklist signed off (Workers data plane, Neon network policy, R2 bucket access, admin gate on Workers); release checklist in PRD §14 complete.
- **Accept:** full PRD §8 journey on the deployed Cloudflare stack (sign in → import → generate via Workflows → workspace → lesson → quiz); a rollback drill and a restore drill each proven once; a green PR auto-deploys through staged rollout without manual steps; CI blocks a regression at eval, typecheck or migration stage.
