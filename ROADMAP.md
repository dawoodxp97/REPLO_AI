# ROADMAP.md

Release 1 plan. Sources: blueprint §16 and §20, [`PRD.md`](./PRD.md) v0.3 (requirement IDs), [`docs/LEGACY_PARITY.md`](./docs/LEGACY_PARITY.md) (features added to R1).

Assumption: **two engineers starting 2 Nov 2026**. One engineer: plan 1.6–2× these durations.

## How the work is ordered

Delivery is **sequenced by track** (MEM D-028):

1. **Backend** (B0–B9): every procedure in the PRD §8 surface, every worker stage and every webhook, with tests. No product UI.
2. **Frontend** (F0–F7): `apps/product` against the finished API.
3. **Landing** (L1): `apps/landing` static site, key guide, docs and policy pages.
4. **Deploy and maintain** (O1–O3): production, beta and ongoing operations.

Inside a track, phases keep their dependency order. Two backend phases run alongside B3: B4 (keys and model picker) and B5 (evals). The frontend starts only after B9, so the UI never builds against a moving contract.

**Option, not default:** F0 (design system, Playwright harness, auth shell) has no API dependency. It can start during B3–B6 and shorten the schedule by about a week. Say if you want it.

**Critical path:** B0 → B1 → B2 → B3 → B6 → B7 → B8 → B9 → F0 → F1 → F2 → F3 → F4 → F5 → F6 → F7 → L1 → O1 → O2 → O3.

**Definition of done**

- **Backend phase:** merged behind tests (contract tests, cross-user 404 tests, Postgres via testcontainers wherever the database is involved). Migration applied to a test database. The matching rows in [`docs/API.md`](./docs/API.md) move to ✅.
- **Frontend phase:** the Playwright steps for that phase pass against staging. Keyboard path and accessibility checked on each new screen. Deployed to staging.
- **Landing:** static build passes. Lighthouse a11y ≥ 90. No ads, no newsletter, no testimonials (ADR-007, MEM D-016, D-019).
- **Deploy and maintain:** restore drill recorded. Alerts tested. Runbook updated.

## Status legend

`[x]` done · `[~]` scaffolded (compiles, stubbed) · `[ ]` not started

## Timeline (estimate, two engineers from 2 Nov 2026)

| Track           | Phases | Weeks   | Done by (approx.) |
| --------------- | ------ | ------- | ----------------- |
| Backend         | B0–B9  | 18      | early Mar 2027    |
| Frontend        | F0–F7  | 12      | end May 2027      |
| Landing         | L1     | 2       | mid Jun 2027      |
| Deploy and beta | O1–O2  | 6       | late Jul 2027     |
| Maintain        | O3     | ongoing | —                 |

This replaces the earlier estimate of a closed beta in late February 2027. Frontend no longer overlaps backend, and the backend grew by B8 and B9. Frontend work runs behind the API, so the beta moves later.

---

## Backend

### B0 — Foundation (2 weeks)

- [x] Monorepo: `pnpm-workspace.yaml`, `turbo.json`, `packages/config`
- [x] `packages/ui` (tokens + Button/Badge/Card on Base UI), `packages/contracts` (full API surface + tutorial content schema, tested)
- [x] `docker-compose.yml` (Postgres 17 + pgvector, MinIO)
- [x] Boundary lint rule (`no-restricted-imports`) — proven to fail on forbidden imports
- [~] CI workflow written (`.github/workflows/ci.yml`), not yet run (repo not under git)
- [~] Three apps build and the HTTP API boots (landing static export, product standalone, api via tsdown); worker + product-against-API need a live Postgres to verify
- [x] pino logging with the secret-redaction filter (NFR-OBS-1)
- **Requirements:** NFR-DX-1, NFR-OBS-1, NFR-COST-1 (design constraint)
- **Accept:** `pnpm dev` runs the apps; CI green; lint fails on a forbidden import.

### B1 — Auth, data, GitHub (2 weeks)

Code complete; live verification pending (needs a GitHub App and a sign-in with a real session). Database paths verified on Postgres 17 (MEM changelog, 22 Oct 2026).

- [~] Drizzle schema (27 tables incl. 4 Better Auth) + first migration generated and drift-checked; applied to Postgres 17 by the integration suite
- [~] Better Auth GitHub sign-in end to end (cookie domain setup) — FR-AUTH-1 (wired; needs GitHub App credentials)
- [~] Revoke other sessions: `POST /api/auth/revoke-other-sessions` mounted by Better Auth; live check with a session pending — FR-AUTH-4
- [~] Account deletion: `me.deleteAccount` cascades installations, links and everything owned; public tutorials delete-or-anonymise choice moves to B8 (MEM D-031) — FR-AUTH-3 (public-tutorial delete-or-anonymise choice landed in B8, MEM D-061; live check pending)
- [x] Individual accounts only: no team or workspace tables or roles in the schema (guard test) — FR-AUTH-2
- [ ] Dev GitHub App: read-only Contents + Metadata; webhooks `installation`, `installation_repositories`, `repository` (MEM open item)
- [~] GitHub App install flow: `GET /github/setup` links only installations GitHub lists for the user (D-029); `github.installUrl`, `github.listRepos` — FR-IMP-2
- [~] Webhook endpoint: HMAC verify, dedupe and the `installation`, `installation_repositories` and `repository` handlers in one transaction (Postgres); `push` handler in B8 — FR-IMP-8
- [~] `repositories.preflight`: languages, file count, size, framework, or a refusal before any LLM call; Git Trees only (D-030) — FR-IMP-3
- [~] `repositories.list`: My repositories, cursor-paginated, with latest job state (Postgres) — first half of FR-LIB-1
- [x] Cross-user 404 and isolation tests: library list, job lookup, GitHub links, keys, tutorials, notifications and settings, plus the procedure-wide sweep (`router.cross-user.integration.test.ts`, Postgres) — NFR-SEC-1
- **Requirements:** FR-AUTH-1, FR-AUTH-2, FR-AUTH-3, FR-AUTH-4, FR-IMP-2, FR-IMP-3, FR-IMP-8, NFR-SEC-1 (start)
- **Accept:** sign-in works; install/uninstall webhooks update `github_installations`; forged webhook rejected; cross-user test returns 404; revoke-other-sessions keeps the current session; account deletion removes keys, progress and private tutorials (keys, progress and tutorials arrive with B4, B6 and B8 and cascade by foreign key).

### B2 — Queue, ingestion, skeleton (2 weeks) → **M1 Walking skeleton (API level)**

Partly done. Import, ingestion, cancel, retry, the SSE stream and the model stages work against Postgres 18 and pg-boss. M1 is **not** reached yet: the outline passes on scripted answers, but the real worker-kill run is still open (B9).

- [x] pg-boss worker entrypoint, claim/heartbeat/reaper, checkpointed stage loop with retry/cancel (unit-tested with fakes; resume exercised against Postgres)
- [x] SSE endpoint: replay via `Last-Event-ID`, owner-only 404, closes at a terminal status (`job-events.route.integration.test.ts`); tarball download and safe extraction wired (`indexing.ingest`)
- [~] `repositories.import`: public and installation repos, idempotent on `Idempotency-Key`, one transaction for repo, link, snapshot, job and enqueue; "< 5 s" not measured (MEM D-032)
- [x] Single tarball per pinned SHA, streamed; submodules omitted by GitHub; LFS pointers dropped; nothing installed or run — FR-IMP-4, FR-IMP-5
- [x] Filters, binary metadata, per-file and repo caps (~5,000 files / ~50 MB; lite cap ~300 selects the pipeline) — FR-IMP-6, FR-IMP-7
- [x] `snapshot_files` population (git blob SHA per file; content kept for ≤ 1 MB text, on disk under `SNAPSHOT_DIR`)
- [x] Job payloads versioned (`v: 1`) and parsed at enqueue and dequeue — NFR-REL-2
- [x] Stages idempotent and checkpointed; resume from the last completed stage — FR-GEN-2 (unit tests; a crash-and-resume chaos test is B9)
- [x] Per-stage timeouts, classified retries with backoff, heartbeat and reaper — NFR-REL-1 (existing)
- [x] `jobs.cancel` and `jobs.retry` from the last checkpoint — FR-GEN-11
- [x] In-app notification written when a job ends (writer side of FR-NTF-1; list endpoints in B8)
- [x] Outline stage on recorded model answers: the lite and full pipelines run against Postgres with scripted answers, including resume after a failed chapter (`pipeline.integration.test.ts`; MEM D-035)
- **Requirements:** FR-IMP-1, FR-IMP-4, FR-IMP-5, FR-IMP-6, FR-IMP-7, FR-GEN-2, FR-GEN-11, FR-NTF-1 (writer), NFR-REL-1, NFR-REL-2, NFR-PERF-1
- **Accept (M1, API level):** import a small public repo → SSE progress and an outline JSON whose every file link resolves; kill the worker mid-job → resumes from the last checkpoint without re-running finished stages; zip-slip, symlink and bomb fixtures rejected; retry resumes a failed job. **Status:** rejection fixtures pass; retry re-queues; the outline passes on scripted answers; the real kill test is open (B9).

### B3 — Repository analysis (3 weeks)

Code complete on six synthetic fixture repos. Persistence and the worker's `index` stage run against Postgres 17. Still open: the ten real golden repos (B5), the call-site graph and the docs layer (MEM D-038, D-039).

- [x] `packages/repo-analysis`: filters and path safety; tree-sitter WASM (`web-tree-sitter` with the TypeScript, TSX and JavaScript grammars from `@vscode/tree-sitter-wasm`); symbols with stable keys; module resolution (relative, `.js`→`.ts`, index files, tsconfig `paths` and `baseUrl`); Next.js (app and pages), React Router, Express and Fastify adapters; entry points; fan-in, fan-out and PageRank; `test_of` edges
- [x] Persist symbols and file edges per snapshot (`symbols`, `file_edges`); entry points, routes and metrics in `repo_snapshots.analysis` (migration `0002`, additive) — FR-GEN-7 and FR-GRD-2 input
- [x] Worker `index` stage: rebuilds a missing snapshot directory from the pinned commit first (MEM D-034); idempotent per analyzer version
- [~] Fixture repos → snapshot-tested indexes (six synthetic repos, reviewed snapshots); entry points correct on all six. Ten real golden repos arrive with B5.
- [x] Worker memory: 5,000 files and 400,000 symbols indexed in about 9 s on this machine, under 0.5 GB RSS (synthetic; measure on a real repo before the 4 GB budget is claimed)
- **Requirements:** index for FR-GEN-7 and FR-GRD-2 (no requirement closed)
- **Accept:** fixture repos → snapshot-tested indexes ✓; entry points correct on all golden repos (six fixtures ✓; ten real repos pending B5); worker within the 4 GB budget (synthetic ✓).

### B4 — BYOK keys and model picker (parallel with B3, 2 weeks)

Code complete except the live outline, which moves to B6 (MEM D-045). Keys, catalogue, presets, estimate, budget ceiling, usage ledger and key removal run against Postgres 17. Live provider behaviour is unverified: no real keys were available.

- [x] Key vault (AES-256-GCM envelope, AAD-bound, rotation) with tests; log-redaction test (key-shaped strings never reach logs)
- [x] `keys.list`, `keys.add` (validated with a free model-list call before storing), `keys.validate`, `keys.delete`; responses show only `…last4` — FR-RUN-3
- [x] Provider endpoints fixed in code for OpenRouter, OpenAI, Google AI Studio and Anthropic; redirects refused, so the key never leaves its host (MEM D-020, D-042) — FR-RUN-4, FR-RUN-11
- [~] Model catalogue for all four providers in `packages/ai/catalog/model-catalog.json`. Anthropic, OpenAI and Google prices are sourced. OpenRouter slugs and prices for the three tier models were verified on 25 Oct 2026 from its public model list (MEM D-083); `free` stays empty until the eval gate runs (MEM D-041, D-048)
- [x] `models.catalog`, `getPreferences`, `setPreferences`; presets `free · budget · balanced · quality · custom`; custom models must be verified and advertise structured output — FR-RUN-5
- [x] Pre-run estimate from the static index (`repositories.estimate`): requests, tokens, cost; import refuses a budget below the estimate; default ceiling $2 (MEM D-043) — FR-RUN-6
- [x] Deleting a key fails its running and queued jobs with `KEY_REMOVED` in the same transaction; the worker stops on its next heartbeat; nothing retries on another key — FR-RUN-12 (MEM D-044)
- [x] `llm_calls` records tokens and cost from the provider's usage numbers and adds the cost to the job's spend — FR-RUN-13
- [ ] Live outline on the user's key replaces the B2 fixture — deferred to B6 with the model stages (MEM D-045). The live call path is tested with the AI SDK mock model.
- **Requirements:** FR-RUN-1, FR-RUN-3, FR-RUN-4, FR-RUN-5, FR-RUN-6, FR-RUN-11, FR-RUN-12, FR-RUN-13, NFR-SEC-3
- **Accept:** key never in logs or API responses (tests); invalid key fails before the job (import re-validates); a failing key never falls back (tests); deleting a key fails its running jobs with `KEY_REMOVED` (Postgres test); catalogue covers all four providers (data, with OpenRouter unverified).

### B5 — Eval harness (parallel with B3, 3 weeks)

The harness is built and runs offline. Ten golden repos are synthetic, and real repos and live probes are still to come (MEM D-046, D-048).

- [x] `tools/evals` skeleton and truth-sheet schema (extended with source, shape and index expectations)
- [~] Golden repos: ten synthetic (`tools/evals/golden/`, fixtures in `packages/repo-analysis/fixtures/`). Real public repos with reviewed sheets are open.
- [x] Index eval: entry, route and import recall and precision; symbol recall; unresolved and parse-error match; compared with the committed baseline; a regression fails the run
- [x] Model probe: schema validity, reference validity, fabrication, entry and route recall, latency, cost; provider failures abort instead of scoring (MEM D-049)
- [x] Allow-list gate as a pure decision (`enter`, `leave`, `keep`, with reasons). Dry run only; it does not write the catalogue (MEM D-047)
- [x] Allow-list gate runs on demand against recorded answers (a nightly run is not required; MEM D-048). A real free model still needs verified slugs and prices before it can enter.
- [x] CI smoke suite: `pnpm --filter @replo/evals smoke` in `ci.yml`, about 1 s here
- [ ] Pipeline metrics (claim support, coverage, sequencing, quiz quality, reference validity after validation): B6–B7
- **Accept:** scored report per pipeline version and model ✓ (`tools/evals/out/report-*.json`); CI smoke suite under 5 minutes ✓.

### B6 — Generation pipeline (3 weeks)

- [x] `packages/ai` (roles, registry, budgets, providers)
- [x] Full and lite pipelines with typed Zod contracts between stages 0–10 — FR-GEN-1, FR-GEN-4 (eight checkpointed stages; model stages are summaries, architecture, outline, lessons and validate; lite merges architecture and outline in one call)
- [x] Budget checked at import (estimate against the ceiling), before each call and settled after; hard stop at the ceiling; spend carries across retries — FR-GEN-5 (no enqueue-time counter by design: the per-job budget is in-process, RULES §4; MEM D-082)
- [x] Audience level is a pipeline input — FR-GEN-6
- [x] Structural diagrams generated from the graph; flow diagrams by model, then validated — FR-GEN-7
- [x] Stage 7: 3–5 questions per chapter, multiple choice or true/false, each with a source reference (MEM D-022) — FR-LRN-5
- [x] Versioned prompts in code; version and SHA-256 hash stored per `tutorial_version` (MEM D-021) — FR-GRD-5
- [x] `openQuestions[]` emitted instead of guesses — FR-GRD-4
- [~] Repo text inside labelled data sections; model tools read-only over one snapshot — NFR-SEC-2 (data sections and read-only inputs are in place; R1 gives the model no tools, so there is no tool scope to restrict yet)
- [x] Publish transaction: one immutable `tutorial_version` plus `lesson_index` rows (feeds FR-SRCH-1)
- [x] Tutorial schema v1 (done in contracts)
- **Requirements:** FR-GEN-1, FR-GEN-4, FR-GEN-5, FR-GEN-6, FR-GEN-7, FR-GRD-4, FR-GRD-5, FR-LRN-5 (generation side), FR-SRCH-1 (index write), NFR-SEC-2
- **Accept:** lite pipeline ≤ ~15 requests; per-job budget never exceeded in tests; same validator for every model.

### B7 — Validation and grounding (2 weeks)

- [x] Reference resolver, identifier checker, flow-hop checker, Mermaid validation, repair loop — FR-GRD-2, FR-GRD-3
- [x] One repair per lesson, then downgrade or remove — FR-GEN-3
- [x] Observed vs interpretation labelling; confidence = verified-claim ratio × judge score, stored in `validation_report` — FR-GRD-1, FR-GRD-6
- [x] Low-confidence output publishes as Draft, never fails silently — FR-GEN-8
- **Requirements:** FR-GRD-1, FR-GRD-2, FR-GRD-3, FR-GRD-6, FR-GEN-3, FR-GEN-8
- **Accept:** reference validity 100% post-validation on every model; fabrication tracked per model; injection test repos produce no unsafe links or commands.

### B8 — Library, learning and sharing APIs (3 weeks)

- [x] `tutorials.list` (paginated), `tutorials.get`, `tutorials.getChapter` (served per chapter) — FR-LIB-1, NFR-PERF-2
- [x] `tutorials.getSource`: path-safe reads at the pinned SHA, any text file ≤ 1 MB — FR-LRN-8
- [x] Banner data: repo changed, new version available, draft or low confidence — FR-LRN-9
- [x] Push webhook handler and path intersection with `tutorial_source_refs` for "repo changed" — FR-IMP-8 (push), FR-IMP-9
- [x] `repositories.remove`: revokes the link, deletes this user's tutorials and progress for the repo — FR-LIB-2
- [x] `tutorials.delete`: removes versions, progress, attempts; public and link URLs stop resolving — FR-LIB-3
- [x] `tutorials.setVisibility` (private → link → public) and `createShareLink`; public needs an OSI licence — FR-SHR-1, FR-SHR-3
- [x] Stable slug assigned on first publish, never changed — FR-SHR-5
- [x] Report and takedown intake for public tutorials — FR-SHR-3 (intake only; takedown decisions are manual in R1)
- [x] Steered-model test: a model that writes a `javascript:` link, a bare URL, markup, an event handler and a shell command publishes none of them (`pipeline.integration.test.ts`)
- [ ] Repo-level injection fixture in `tools/evals` (MEM open item)
- [x] `learning.getProgress`, `markLesson`, `unmarkLesson`, `submitQuiz`, per tutorial version; progress overview — FR-LRN-6, FR-LRN-12
- [x] `search.own`: own repos, tutorials and lesson titles via `pg_trgm` — FR-SRCH-1
- [x] `dashboard.summary` and `dashboard.recent`; date buckets in the caller's `tz`, computed in Postgres — FR-DASH-1
- [x] `notifications.list`, `unreadCount`, `markRead`, `markAllRead`, `delete`; the unread count is pushed over `GET /notifications/stream` — FR-NTF-1
- [x] `settings.get` and `settings.update` (`user_preferences`) — FR-SET-1
- [x] Operator read endpoints over `generation_jobs`, `job_stages`, `llm_calls`, behind a single operator flag (see open questions) — FR-OPS-1
- [x] Cross-user 404 tests for every private procedure (per-module suites and the sweep in B9)
- **Requirements:** FR-LIB-1, FR-LIB-2, FR-LIB-3, FR-DASH-1, FR-SRCH-1, FR-NTF-1, FR-SET-1, FR-LRN-6, FR-LRN-8, FR-LRN-9, FR-LRN-12, FR-SHR-1, FR-SHR-3, FR-SHR-5, FR-IMP-8 (push), FR-IMP-9, FR-OPS-1, NFR-PERF-2 (API side)
- **Accept:** every procedure in `docs/API.md` for B8 is ✅ with contract tests; cross-user 404 on every private procedure; a public tutorial reads without auth; the slug never changes after publish.

### B9 — Backend hardening and gate (1 week)

- [x] Request id on every log line and in every error body — NFR-OBS-2
- [x] Rate limits on sign-in, import and key validation; 429 with `Retry-After` — NFR-SEC-7 (per process and in memory; MEM D-058)
- [x] Origin check on every state-changing request — NFR-SEC-4 (backend half)
- [x] Retention purge jobs: tarballs ≤ 24 h; `job_events`, `llm_calls`, `notifications` 90 days; private blobs once unreferenced — NFR-SEC-6 (daily)
- [x] Cross-user sweep over every procedure: a stranger gets NOT_FOUND on every record ID, no owner row appears in any listing, and no session gets data (`router.cross-user.integration.test.ts`) — NFR-SEC-1
- [~] Chaos tests: worker killed mid-stage, duplicate webhook delivery, job redelivered after a crash — NFR-REL-1 (resume after a failed chapter, duplicate delivery and forged webhooks are tested; a real worker kill is not)
- [~] Contract freeze: `docs/API.md` complete; the frontend starts from it (docs/API.md rows are all implemented; no frozen contract tag yet)
- **Requirements:** NFR-OBS-2, NFR-SEC-1 (sweep), NFR-SEC-4 (backend), NFR-SEC-6, NFR-SEC-7, NFR-REL-1 (tests)
- **Accept (backend gate):** every row in `docs/API.md` is ✅; the security test suite passes; the walking skeleton replays on a fresh database built from migrations alone.

---

## Frontend (`apps/product`, Next.js 16)

### F0 — Frontend foundation (1 week)

- [x] Route shells for dashboard, import, job, overview, player, source explorer, settings
- [x] Design tokens and primitives wired in light and dark (DESIGN.md, `packages/ui`): Button, Badge, Card, Input, Select, Textarea, Label, FormField, Alert, Skeleton, Dialog, Popover — NFR-A11Y-1 (base). Contrast is checked in both themes by axe
- [x] oRPC client and TanStack Query wiring; the only shared types come from `packages/contracts`; one Idempotency-Key per import attempt (D-066)
- [x] Strict CSP with nonces from `src/proxy.ts` (D-068); the allow-list Markdown renderer (`SafeMarkdown`) and its link policy landed with their first consumer in F3 (D-072) — NFR-SEC-4 (web)
- [x] Mermaid and Shiki load only when visible; CodeMirror is not in R1 (FR-LRN-11 is V) — NFR-PERF-2
- [x] Playwright harness: 98 browser tests on desktop and phone, production build, mock API with recorded responses (D-074)
- [x] Auth shell: `AuthGate` checks `me.get` and sends signed-out users to sign-in; route guards are UX only, the backend is the authority (D4)
- **Accept:** shell builds; CSP header present in responses; Playwright smoke test passes. Met locally on the production build. Staging run still open.

### F1 — Sign-in, import and keys (2 weeks) → **M1 UI**

- [~] GitHub sign-in and session — FR-AUTH-1 (sign-in, session gate and sign-out built; the GitHub round trip needs the GitHub App)
- [~] Import by URL, and by picking from the GitHub App's repos (install link when none are listed) — FR-IMP-1, FR-IMP-2
- [~] Pre-flight panel: languages, file count, size, framework, or the refusal reason — FR-IMP-3
- [~] Key form: add, check, delete; shown as `…last4`; OpenRouter recommendation and key link — FR-RUN-3, FR-RUN-11 (the landing key guide is L1)
- [~] Preset and audience level pickers; estimate and budget ceiling shown before start; custom models in Settings → Models — FR-RUN-5, FR-RUN-6, FR-GEN-6
- [~] My repositories page, cursor-paginated, with latest job state, and removal with a named confirmation — FR-LIB-1, FR-LIB-2
- **Requirements:** FR-AUTH-1, FR-IMP-1, FR-IMP-2, FR-IMP-3, FR-RUN-3, FR-RUN-5, FR-RUN-6, FR-RUN-11, FR-GEN-6, FR-LIB-1
- **Accept:** Playwright: sign in → import fixture → pre-flight → add key → start job. Passes locally on recorded responses, including a retry that reuses its Idempotency-Key. Live run against the API and staging still open.

### F2 — Generation progress and notifications (1 week)

- [~] Live stage progress over SSE, resumed from `Last-Event-ID`: a pure reducer drops replayed events by id, and a browser test shows the feed converging after a reconnect. Playwright does not expose the `Last-Event-ID` header on retries, so the header is covered by the API tests (`job-events.route.integration.test.ts`) — FR-GEN-11 (UI)
- [x] Cancel and retry from the job page — FR-GEN-11
- [x] Notification bell: unread count pushed over `GET /notifications/stream` (a 30 s poll runs only while the stream is down), list, mark read, remove — FR-NTF-1 (browser test covers the stream path)
- **Requirements:** FR-GEN-11 (UI), FR-NTF-1 (UI)
- **Accept:** dropping the connection mid-run resumes the progress feed without duplicates. Reducer tests and the reconnect test pass; live check pending.

### F3 — Learning player (3 weeks)

- [x] Overview: architecture diagram (lazy Mermaid, `securityLevel: 'strict'`, with text steps), outline, objectives, version picker, share — FR-LRN-7
- [x] Player: collapsible outline, lesson, resizable source panel (layout kept per browser); sheets below 768 px — FR-LRN-1
- [x] Source panel: Shiki highlight loaded when visible, cited range highlighted, breadcrumb, "Open on GitHub" with a line anchor — FR-LRN-2
- [x] Block types prose, code, diagram, callout, exercise; every evidence chip opens its source range — FR-LRN-3
- [x] Observed vs interpretation rendered distinctly; `openQuestions` shown on the overview — FR-GRD-1, FR-GRD-4
- [x] Chapter, lesson and active reference in the URL; keys n, p, r, m and Ctrl/⌘+K for the command palette — FR-LRN-4
- [x] Banners: repo changed, new version, draft and confidence — FR-LRN-9, FR-GEN-8
- [x] Source explorer at the pinned commit: the full tree from `tutorials.sourceTree` (MEM D-080), with the files the tutorial cites marked, and any text file up to 1 MB — FR-LRN-8
- [x] Code blocks are highlight-only, with no run control (ADR-008) — FR-LRN-10
- [x] Chapters loaded one at a time; next lesson prefetched; long files show a 1,000-line window — NFR-PERF-2
- **Requirements:** FR-LRN-1, FR-LRN-2, FR-LRN-3, FR-LRN-4, FR-LRN-7, FR-LRN-8, FR-LRN-9, FR-LRN-10, FR-GRD-1, FR-GRD-4, FR-GEN-8
- **Accept:** a cited range opens the right lines at the pinned commit; a lesson can be completed with the keyboard alone. Both pass on the browser suite. Staging run still open.

### F4 — Quiz and progress (1 week)

- [x] Quiz: multiple choice and true/false, graded by the API, with the explanation and its evidence chips; the answer key is not on the page before an attempt — FR-LRN-5 (MEM D-022)
- [x] Resume opens the last unfinished lesson (server redirect from `?resume`) — FR-LRN-6
- [x] Progress page: completion, paginated history, unmark a lesson — FR-LRN-12
- **Requirements:** FR-LRN-5 (UI), FR-LRN-6 (UI), FR-LRN-12 (UI)
- **Accept:** quiz attempts persist; a regenerated version keeps progress for unchanged lesson keys. Persistence is covered by the API tests; the browser suite covers grading, resume and history.

### F5 — Library, home, search, settings, sharing (2 weeks)

- [x] My tutorials: paginated, with status and read progress; delete with confirmation — FR-LIB-1, FR-LIB-3
- [x] Remove a repo from the library, with a confirmation that names what is deleted — FR-LIB-2
- [x] Home dashboard: counts, jobs in flight, resume, recent activity in the browser's time zone — FR-DASH-1
- [~] Search box over the caller's own library. Lesson results link only when their tutorial is in the same results — FR-SRCH-1
- [x] Settings: profile and avatar from GitHub, theme, default audience, quizzes, auto-advance, browser notifications; GitHub and models sections — FR-SET-1
- [x] Sign out other sessions; delete account with typed confirmation and the public-tutorial choice — FR-AUTH-4, FR-AUTH-3
- [~] Visibility control: private, link (copy link), public with the licence refusal shown — FR-SHR-1, FR-SHR-3. The browser test covers issuing and changing the link; a private link returning 404 is covered by the API tests
- **Requirements:** FR-LIB-1, FR-LIB-2, FR-LIB-3, FR-DASH-1, FR-SRCH-1, FR-SET-1, FR-AUTH-3 (UI), FR-AUTH-4 (UI), FR-SHR-1 (UI), FR-SHR-3 (UI)
- **Accept:** create → share link → set private → link stops working. The first three steps are on the browser suite; the last is on the API tests. Staging run still open.

### F6 — Public pages and operator screen (1 week)

- [x] Public tutorial pages server-rendered at `/tutorials/{owner}/{repo}/{slug}`, readable without JavaScript; OG image only for public tutorials; other pages send `private` cache headers and `noindex` — FR-SHR-2, FR-SHR-5
- [x] Licence and attribution shown; report form for public tutorials — FR-SHR-3
- [x] Operator screen for jobs, stages and LLM calls, behind the API's operator check; any other user gets 404 — FR-OPS-1
- **Requirements:** FR-SHR-2, FR-SHR-3 (UI), FR-SHR-5 (URL), FR-OPS-1 (UI)
- **Accept:** a public page renders its content without JavaScript; the operator route returns 404 to other users. Both pass on the browser suite.

### F7 — Frontend quality gate (1 week)

- [~] PRD §14 journey: import → progress → read lesson → quiz → share passes on recorded responses (100 Playwright tests on desktop and phone, run locally on 25 Oct 2026). Staging run pending
- [x] Keyboard path through the player: n, p, r, m and Ctrl/⌘+K (the palette); Tab-only traversal is not exhaustively tested — NFR-A11Y-1
- [x] Accessibility: axe (WCAG 2.0/2.1 A and AA) reports no serious or critical violations on six pages in light and dark, and reduced motion stops the loading animation. Lighthouse 13.4 on the production build (mock API): accessibility 1.00 on the lesson and the overview, after the lesson and source explorer gained a `main` landmark. Best practices 0.92: the strict CSP logs violations for inline `style` attributes (MEM D-084) — NFR-A11Y-1
- [x] Mermaid and Shiki are absent from the sign-in page's first JavaScript and load on demand; CodeMirror is not in R1 — NFR-PERF-2
- **Requirements:** NFR-A11Y-1 (gate), NFR-PERF-2 (gate)
- **Accept:** journey green locally; accessibility and bundle checks green locally; Lighthouse accessibility on the player is 1.00 locally. The staging run is still open.

---

## Landing (`apps/landing`, static export)

### L1 — Landing site and docs (2 weeks)

- [x] `apps/landing` static export (MEM D-008; TSX pages, no MDX, so no new dependency)
- [x] Hero, features and CTA match the PRD; primary CTA "Generate a tutorial for your repo"; no "adaptive difficulty", "live execution" or "ten minutes" claims. The lesson preview is labelled as an example (MEM D-025, ADR-008)
- [x] Key guide at `/keys/`: OpenRouter recommended; OpenAI, Google AI Studio and Anthropic supported without a recommendation; `:free` limits stated per OpenRouter account, dated 25 Oct 2026 — FR-RUN-11
- [x] Docs: how it works, how grounding is checked, and key handling and privacy (`/docs/…`)
- [x] Policy pages: privacy, terms, licence and takedown, each marked "Draft. Reviewed before launch." — FR-SHR-3. Counsel review and the founder's details are open (MEM open items)
- [x] Navigation and footer link every page; no newsletter, no testimonials, no ad or analytics scripts (MEM D-016, D-019; ADR-007)
- [x] Accessibility: Lighthouse accessibility 100 on all 12 routes, and axe in dark mode at 320 px with no violations or horizontal scroll (landing agent report, 25 Oct 2026) — NFR-A11Y-1
- [~] `script-src 'unsafe-inline'` stays in `public/_headers`: Next's static output needs inline bootstrap scripts, and Cloudflare cannot carry build-time hashes, so a tighter policy is not verified
- **Requirements:** FR-RUN-11 (copy), FR-SHR-3 (policy pages), NFR-A11Y-1
- **Accept:** static build succeeds ✓; no ad or newsletter scripts ✓; every internal link resolves (375 links and fragments checked) ✓; readable in both themes ✓ (dark mode at 320 px checked; full desktop visual review still open). Deployment (Cloudflare Pages) is in O1.

---

## Deploy and maintain

### O1 — Deploy (2 weeks)

Not started in this workspace. Building the images needs Docker, which is not available here, and every item below needs the VPS, the domain, the R2 bucket, a Sentry project or the production GitHub App. The product's `start` script already runs the standalone build, and the CI actions are pinned (both done).

- [ ] VPS Compose: Postgres 17, API, worker, Caddy behind Cloudflare; Cloudflare Pages for the landing site; ≤ ~€7/month — NFR-COST-1
- [ ] Migrations run as their own step before new code rolls out; expand → backfill → contract for breaking changes (RULES §4)
- [ ] Worker container: non-root, read-only root filesystem, `noexec` temp volume, `no-new-privileges`, egress allow-list, memory and timeout limits — NFR-SEC-5
- [ ] Secrets: KEK only in the server secret store, never in the database — NFR-SEC-3
- [ ] Production GitHub App; domain set; `NEXT_PUBLIC_SITE_URL` and cookie domain (MEM open items)
- [ ] Sentry wired (moved from B0); error events checked for redaction — NFR-OBS-1
- [~] Strict CSP with nonces: confirmed on the local standalone build (nonce and `strict-dynamic`, no `unsafe-inline`); production headers wait for the deploy, and inline `style` attributes still violate it (MEM D-084) — NFR-SEC-4
- [ ] Nightly encrypted `pg_dump` to R2, 14-day retention — FR-OPS-3
- [ ] Alerts: job failure > 20%/h, oldest queued > 15 min, disk > 80%, backup failed, key-validation failure spike — FR-OPS-2
- [ ] Restore drill done and recorded — FR-OPS-3
- [x] GitHub Actions pinned to commit SHAs (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, all v4; resolved from the tags on 25 Oct 2026)
- [ ] SECURITY.md controls implemented; threat-model checklist signed off (PRD §14)
- **Requirements:** FR-OPS-2, FR-OPS-3, NFR-COST-1, NFR-OBS-1, NFR-SEC-3 (KEK placement), NFR-SEC-4 (production CSP), NFR-SEC-5
- **Accept:** restore drill done; alerts fire in a staging chaos test; threat-model checklist signed off.

### O2 — Beta and launch (4 weeks)

- [ ] Invite developers; run interviews
- [ ] Key-setup funnel tracked (signed in → first key → first tutorial) and provider mix; event source decided (see open questions)
- [ ] Model-quality and cost calibration with the eval harness; update the free allow-list
- [ ] PRD §10 metrics measured weekly
- **Accept:** blueprint §3 metrics measured weekly; key-setup completion and provider mix tracked.

### O3 — Maintain (ongoing)

- [ ] Runbook: deploy, roll back, restore, rotate keys, provider outage, stuck job, reading alerts
- [ ] Monthly restore drill — FR-OPS-3
- [ ] Dependency updates through the pnpm gate; majors only with a MEM entry (TECH_STACK, RULES §8)
- [ ] Eval gate on demand: models that fail the gate leave the allow-list (RULES §6); no nightly run (MEM D-048)
- [ ] Monthly retention check against NFR-SEC-6
- [ ] Review PRD §13 open questions against the funnel data
- **Requirements:** FR-OPS-3 (drill), NFR-SEC-6 (check)
- **Accept:** a month passes with the drill, updates and alerts recorded in MEM.

---

## Milestones

1. **M1 Walking skeleton (end of B2, ~week 6, API level).** Fixture-driven outline, live progress, working source links in JSON.
2. **M2 Index you can trust (end of B3).** Symbols, import graph, entry points correct on 10 golden repos, snapshot-tested.
3. **M3 Grounded generation on a real key (end of B4–B7).** Eval numbers on the free allow-list and one frontier preset; the vault proves keys never reach logs or responses.
4. **M4 Backend complete (end of B9, ~week 18).** Every row in `docs/API.md` ✅ with tests.
5. **M5 Frontend complete (end of F7, ~week 30).** The full journey is green on staging.
6. **M6 Live (end of O2).** Product and landing in production; beta open.

## Requirement coverage

Each PRD requirement that is Essential, and each NFR, is assigned to a phase. Retired IDs and the "after validation" and "later" IDs are not scheduled.

| Phase | Requirements                                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B0    | NFR-DX-1, NFR-OBS-1, NFR-COST-1                                                                                                                                                                      |
| B1    | FR-AUTH-1, FR-AUTH-2, FR-AUTH-3, FR-AUTH-4, FR-IMP-2, FR-IMP-3, FR-IMP-8, NFR-SEC-1 (start)                                                                                                          |
| B2    | FR-IMP-1, FR-IMP-4, FR-IMP-5, FR-IMP-6, FR-IMP-7, FR-GEN-2, FR-GEN-11, FR-NTF-1 (writer), NFR-REL-1, NFR-REL-2, NFR-PERF-1                                                                           |
| B3    | Index for FR-GEN-7 and FR-GRD-2 (no requirement closed)                                                                                                                                              |
| B4    | FR-RUN-1, FR-RUN-3, FR-RUN-4, FR-RUN-5, FR-RUN-6, FR-RUN-11, FR-RUN-12, FR-RUN-13, NFR-SEC-3                                                                                                         |
| B5    | Eval gate for FR-GRD-6 and RULES §6 (no requirement closed)                                                                                                                                          |
| B6    | FR-GEN-1, FR-GEN-4, FR-GEN-5, FR-GEN-6, FR-GEN-7, FR-GRD-4, FR-GRD-5, FR-LRN-5 (generation), FR-SRCH-1 (index write), NFR-SEC-2                                                                      |
| B7    | FR-GRD-1, FR-GRD-2, FR-GRD-3, FR-GRD-6, FR-GEN-3, FR-GEN-8                                                                                                                                           |
| B8    | FR-LIB-1, FR-LIB-2, FR-LIB-3, FR-DASH-1, FR-SRCH-1, FR-NTF-1, FR-SET-1, FR-LRN-6, FR-LRN-8, FR-LRN-9, FR-LRN-12, FR-SHR-1, FR-SHR-3, FR-SHR-5, FR-IMP-8 (push), FR-IMP-9, FR-OPS-1, NFR-PERF-2 (API) |
| B9    | NFR-OBS-2, NFR-SEC-1 (sweep), NFR-SEC-4 (backend), NFR-SEC-6, NFR-SEC-7, NFR-REL-1 (tests)                                                                                                           |
| F0    | NFR-A11Y-1 (base), NFR-SEC-4 (web), NFR-PERF-2 (loading)                                                                                                                                             |
| F1    | FR-AUTH-1, FR-IMP-1, FR-IMP-2, FR-IMP-3, FR-RUN-3, FR-RUN-5, FR-RUN-6, FR-RUN-11, FR-GEN-6, FR-LIB-1 (UI)                                                                                            |
| F2    | FR-GEN-11, FR-NTF-1 (UI)                                                                                                                                                                             |
| F3    | FR-LRN-1, FR-LRN-2, FR-LRN-3, FR-LRN-4, FR-LRN-7, FR-LRN-8, FR-LRN-9, FR-LRN-10, FR-GRD-1, FR-GRD-4, FR-GEN-8 (UI)                                                                                   |
| F4    | FR-LRN-5, FR-LRN-6, FR-LRN-12 (UI)                                                                                                                                                                   |
| F5    | FR-LIB-1, FR-LIB-2, FR-LIB-3, FR-DASH-1, FR-SRCH-1, FR-SET-1, FR-AUTH-3, FR-AUTH-4, FR-SHR-1, FR-SHR-3 (UI)                                                                                          |
| F6    | FR-SHR-2, FR-SHR-3 (UI), FR-SHR-5 (URL), FR-OPS-1 (UI)                                                                                                                                               |
| F7    | NFR-A11Y-1 (gate), NFR-PERF-2 (gate)                                                                                                                                                                 |
| L1    | FR-RUN-11 (copy), FR-SHR-3 (policy pages), NFR-A11Y-1                                                                                                                                                |
| O1    | FR-OPS-2, FR-OPS-3, NFR-COST-1, NFR-OBS-1 (Sentry), NFR-SEC-3 (KEK placement), NFR-SEC-4 (production CSP), NFR-SEC-5                                                                                 |
| O2    | PRD §10 metrics (no requirement ID)                                                                                                                                                                  |
| O3    | FR-OPS-3 (drill), NFR-SEC-6 (check)                                                                                                                                                                  |

Not scheduled on purpose: FR-GEN-9 and FR-GEN-10 (after validation), FR-LRN-11 (after validation).

## Open questions raised by this plan

1. **Operator screen vs. FR-AUTH-2.** FR-OPS-1 needs someone who can see every job. The plan uses one operator boolean set in the database, not a role system. Confirm that is acceptable under "no roles".
2. **Push webhooks.** FR-IMP-9 is Essential, but FR-IMP-8 lists `push` as "later". The plan brings push into B8. Confirm.
3. **Key-setup funnel events (O2).** Recommendation: first-party events stored in Postgres, no third-party analytics scripts. This keeps the landing site free of trackers.
4. **Frontend overlap.** The default plan starts F0 after B9. The option in "How the work is ordered" starts it earlier.

## Postponed (do not start without evidence)

Tutor chat · embeddings · incremental regeneration · tutorial editing · any code execution · dependency explorer · languages beyond TS/JS · anything team-related.

## Never (ADR-007)

Pricing · billing · subscriptions · prepaid credits and top-ups · ads of any kind · platform-funded AI (free pool or credits). These are not postponed; they are out for good.

## Validation experiments

E1 orientation speed vs. wikis · E2 completion rates · E3 embeddings ablation · E4 cheaper-model ablations · E5 (retired with top-ups, ADR-007) · E6 provider mix and key-setup drop-off · E7 public-tutorial acquisition · E8 tolerance for ~10-min generation. Details and thresholds: blueprint §18.3.

## Biggest technical risk — tackle first

**Grounded quality from free and budget models.** Run evals on the free allow-list during weeks 3–7 alongside the indexer. If claim support stays too low after two iteration cycles, narrow the lite pipeline (smaller repos, fewer chapters) and recommend stronger models in the picker. The platform never pays for models (ADR-007). Build and test the key vault **before the first user pastes a key**.
