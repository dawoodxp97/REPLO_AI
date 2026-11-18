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
| **R9** | Release hardening and deploy                                                                                | L    | R1–R8      |

Estimate, two engineers: **~16–20 weeks**. R5 and R6 can run beside R3/R4; R7 starts when the pipeline can produce fixtures.

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

- [ ] `docs/API.md`, `docs/DATABASE.md`, `docs/HOW_GENERATION_WORKS.md` rewritten to the current system.
- [ ] Remove stale feature references from `SECURITY.md`, `DESIGN.md`, `README.md`, code comments and landing copy.
- [ ] Delete dead modules, tables, contracts and fixtures left by removed features.
- **Accept:** `grep` finds no reference to a removed feature; docs match code; no unused exports or tables.

## R9 — Release hardening and deploy (L)

- [ ] VPS Compose, Caddy, worker hardening; nightly encrypted backups to R2; restore drill.
- [ ] Alerts: failure rate, queue age, disk, backup, key-validation spike.
- [ ] Live GitHub App, live Google/GitHub sign-in, a real provider key end to end.
- [ ] Threat-model checklist signed off; release checklist in PRD §14 complete.
