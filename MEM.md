# MEM.md — Project memory

Living log of **decisions, deviations from the blueprint, assumptions, gotchas and open items**. Append; don't rewrite history (mark superseded entries instead). AI agents: read this before starting, add to it when you learn something non-obvious.

Entry format: `ID · date · status` → what · why · how to apply.

## Product snapshot

- **Name:** Replo. Package scope `@replo/*`. Folder: `Replo AI/`.
- **One line:** grounded, chaptered tutorials for any TS/JS GitHub repo; free for everyone, BYOK only, individual developers only. No pricing, billing, credits or ads, ever (ADR-007).
- **Source docs:** `Replo_BluePrint.md` (research, 14 Oct 2026) → `PRD.md` (build contract).
- **Current phase:** backend B0–B9 and frontend F0–F7 are implemented with local tests (25 Oct 2026); the landing site (L1) is implemented as drafts pending review. Still open: live verification (GitHub App, real provider keys, staging), the real worker-kill run, and O1–O3 (deploy, beta, maintain). See ROADMAP.md for each item.

## Decisions

### D-001 · 2026-10-18 · active — Monorepo scaffolded to the blueprint layout

Three apps (`landing`, `product`, `api`), five packages (`contracts`, `ai`, `repo-analysis`, `ui`, `config`) and `tools/evals`. `api-client` and `db` are **not** separate packages (folded into `apps/product` / `apps/api`) per blueprint §5.1.

### D-002 · 2026-10-18 · active — Stay on pnpm 11 / TypeScript 6 / AI SDK 6 / pg-boss 10 despite newer majors on npm

npm already has pnpm 12, TypeScript 7.0, AI SDK 7 and pg-boss 12. The blueprint pins pnpm 11, TS 6.0 (7.0 is "non-blocking CI"), AI SDK 6, pg-boss 10.x. **Why:** blueprint code and risk analysis were written against these; upgrades are deliberate, not drive-by. **How:** pin in `catalog:`/`packageManager`; revisit each major with a dedicated PR + eval run.

### D-003 · 2026-10-18 · active — Product name "Replo"

Blueprint placeholder scope was `@acme/*`; replaced with `@replo/*`. Repo root package is `replo`.

### D-004 · 2026-10-18 · active — `moduleResolution: Bundler` everywhere (deviation from blueprint §15.2)

Blueprint suggests `NodeNext` for API/libs. With NodeNext every relative import needs a `.js` extension, which is noise for packages that are always bundled (tsdown/Next) or run via `tsx`. **How:** `packages/config/tsconfig.base.json` uses `module: ESNext`, `moduleResolution: Bundler`; revisit only if something must run un-bundled under plain Node.

### D-005 · 2026-10-18 · active — Boundary lint via `no-restricted-imports`, not a plugin

Blueprint allows "ESLint boundaries or dependency-cruiser". We start with `no-restricted-imports` pattern rules in `packages/config/eslint` (zero extra deps, readable). Move to `eslint-plugin-boundaries` if rules outgrow patterns.

### D-006 · 2026-10-18 · active — Vitest 3.x

Latest is 5.x; blueprint doesn't pin. 3.x chosen as the conservative, widely-used line. Bump when convenient.

### D-007 · 2026-10-18 · active — Fonts via `next/font/google`

Geist (UI), Newsreader (reading/display), Geist Mono (code). Requires network at build time on first build (fonts are then self-hosted in output).

### D-008 · 2026-10-18 · active — Landing is a static export; no MDX yet

`apps/landing` uses `output: 'export'`. MDX docs are planned (blueprint §4.2) but deferred until there is docs content; add `@next/mdx` then.

### D-009 · 2026-10-18 · active — API/worker ports and process split

HTTP on `4000`, worker health on `4001`, landing `3000`, product `3001`. `pnpm dev` runs `dev` and `dev:worker` for all packages via Turborepo.

### D-010 · 2026-10-18 · active — Supply-chain gate kept; version floors lowered instead

`minimumReleaseAge: 4320` (3 days) rejected fresh releases (`next@16.4.2`, `ai@6.0.309`, `@tanstack/react-query@5.104.4` …) with `ERR_PNPM_NO_MATURE_MATCHING_VERSION`. **How:** keep the gate; use older floors in ranges (`next ^16.3.0`, `ai ^6.0.0`, `@tanstack/react-query ^5.90.0`, `@ai-sdk/* ^3.0.0`) so pnpm resolves mature versions; never add `minimumReleaseAgeExclude` without a note here. Expect this on every dependency bump.

### D-011 · 2026-10-18 · active — `allowBuilds` reviewed

`esbuild: true` (platform binary). `unrs-resolver: false` (eslint-config-next's resolver; prebuilt napi binaries, postinstall unnecessary). pnpm 11's `strictDepBuilds` fails the install with `ERR_PNPM_IGNORED_BUILDS` until every build-script package is explicitly `true` or `false` — the map shape in the blueprint (`allowBuilds: { esbuild: true }`) is correct.

### D-012 · 2026-10-18 · active — Generated agent files

Next 16 writes `AGENTS.md` into the app on `next dev`; disabled with `agentRules: false` in both Next configs. Agent guidance lives in `CLAUDE.md` / `RULES.md`.

### D-013 · 2026-10-18 · active — Honest stubs

Unbuilt procedures throw `NOT_IMPLEMENTED`; unbuilt pipeline stages throw terminal `STAGE_NOT_IMPLEMENTED` so a job fails visibly instead of "succeeding" with no tutorial. Remove each stub as its phase lands.

### D-014 · 2026-10-22 · active — BYOK only, free for everyone, no billing ever (ADR-007)

Replo never charges users, never pays for AI and never shows ads. Every job runs on a key the user owns. Providers: OpenRouter (the one recommended provider), OpenAI, Google AI Studio, Anthropic. **Why:** the founder's decision; it removes quotas, a credit ledger, ad accounting and a second class of limits. **How to apply:** no platform-owned provider keys anywhere (config, env, code). Never add a pricing, billing, credit, top-up or ad surface, even behind a flag. Model presets stay; `free` means OpenRouter `:free` models on the user's own OpenRouter key.

### D-015 · 2026-10-22 · active — Quota machinery deleted, migration regenerated

Removed before it was ever deployed: `free_pool_daily`, `daily_free_usage`, `credit_ledger`, `ad_revenue_monthly`, the `run_source` enum and its columns, the `credits` module and contract, and the free/credit env vars. `generation_jobs.key_id` is nullable with `ON DELETE SET NULL`, so a deleted key fails the job with `KEY_REMOVED`. Migration `0000` was regenerated as `0000_cute_zemo.sql`; there was no live database to migrate. **How to apply:** once any database has applied the old `0000`, this must become an expand/contract migration, not a regeneration.

### D-016 · 2026-10-22 · active — Legacy app is the feature baseline, not the code baseline

The legacy app (`OLD_LEGACY_REPLO/replo-hq-main`) was read for features, pages and flows only. Every legacy feature is dispositioned in [`docs/LEGACY_PARITY.md`](./docs/LEGACY_PARITY.md) as covered, to add, to decide, or dropped. Dropped and not ported: billing tables, credits, the five free platform generations, Stripe subscription statuses, the mock newsletter endpoint, the demo input page, and the testimonials (named people with no evidence they exist). **Why:** the new product must not drop legacy features silently, and must not carry legacy shortcuts across. **How to apply:** a new feature traces to a requirement ID in the parity doc or to a new decision here.

### D-017 · 2026-10-22 · active — Release 1 runs no code, including generated examples (ADR-008)

The player is highlight-only, with no in-browser or server-side execution of any code. This is the decision behind legacy Sandpack not being ported. **Why:** repository code and model output are both untrusted (ADR-005, RULES §0.1), and running code in the player widens the page's attack surface. **How to apply:** do not add a runnable code block, a "run" button or a sandbox iframe. Revisit only through an ADR-005 sandbox design.

### D-018 · 2026-10-22 · active — Lean dashboard now; no streaks, heatmap or learning hours in R1

The home dashboard shows counts, jobs in flight, resume and recent activity (FR-DASH-1). Streaks, the weekly heatmap, learning hours and a daily goal are postponed. **Why:** they need a time-on-lesson metric and a streak definition that the PRD does not have. **How to apply:** if they are adopted later, copy the legacy rule: dates bucketed in the caller's `tz`, all date maths in Postgres. Never mix server-timezone and caller-timezone dates.

### D-019 · 2026-10-22 · active — No email in R1: in-app and browser notifications only

No completion email, no weekly digest, no newsletter, and no outbound webhook on completion. The notification centre (FR-NTF-1) is in-app, and browser notifications are a preference (FR-SET-1). **Why:** email needs a provider and consent handling the PRD does not have; this closes the open question in PRD §13. **How to apply:** do not add an email sender in R1 without a new decision here.

### D-020 · 2026-10-22 · active — No user-supplied provider endpoints

The legacy "custom OpenAI-compatible base URL" is dropped. Providers are OpenRouter, OpenAI, Google AI Studio and Anthropic, with fixed base URLs. **Why:** RULES §4 (SSRF). **How to apply:** no `base_url` field on keys, in the contract or in the UI.

### D-021 · 2026-10-22 · active — Prompts are versioned in code, not editable in the database

The AI_LAYER_PLAN asked for prompts in DB rows. Prompts ship as code, each with a version, and the version and SHA-256 hash are stored with every `tutorial_version` (FR-GRD-5). **Why:** a prompt edited in a table changes outputs with no record, and reproducibility fails. **How to apply:** prompt changes go through review and an eval run; no admin screen edits prompts.

### D-022 · 2026-10-22 · active — Quizzes may be true/false as well as multiple choice

FR-LRN-5 now allows true/false questions alongside multiple choice, with the same grader and the same rule that every explanation cites a source. **Why:** cheap to add and matches the legacy question types. **How to apply:** the grader must enforce exactly one correct answer for each question type. Do not return the answer key before an attempt.

### D-023 · 2026-10-22 · active — Profile is GitHub name and avatar only; UI language deferred

No bio, location, website or connected-accounts fields in R1. Language support is deferred. **Why:** the profile fields do not help learning, and the second-language demand is still an open question (PRD §13). **How to apply:** name and avatar come from GitHub on sign-in and are not editable in the product.

### D-024 · 2026-10-22 · active — Focus areas and free-text learning goals stay "after validation" (FR-GEN-9)

Legacy generation accepted focus areas and free-text context. The new design keeps FR-GEN-9 at **V**. **Why:** free text is untrusted input, and it needs the same grounding checks as everything else. **How to apply:** if pulled forward, the text enters the prompt only inside a labelled data section (RULES §6), never as instructions.

### D-025 · 2026-10-22 · active — Adaptive difficulty dropped

Audience level (newcomer, intermediate, expert) is a user choice made at import (FR-GEN-6). Nothing adjusts it from the learner's progress. **Why:** adaptive difficulty needs a learner model the PRD does not have. **How to apply:** do not add a level-adjusting job or a "recommended level" from progress data.

### D-026 · 2026-10-22 · active — Manual authoring stays out of R1

Owners can change visibility, delete a tutorial, and remove a repo from the library. They cannot edit modules, lessons, quizzes or titles (non-goal, PRD §2). **Why:** hand-written prose bypasses grounding. A manual claim would have to be labelled `interpretation`, which undercuts the core promise. **How to apply:** no editor screens or authoring procedures in R1.

### D-027 · 2026-10-22 · active — No ads in the roadmap

ROADMAP P9 said "house ads". ADR-007 and RULES §0.7 forbid ads, so the phrase was removed. **How to apply:** any ad wording in docs or copy is a bug to fix.

### D-028 · 2026-10-22 · active — Delivery is sequenced: backend, frontend, landing, then deploy and maintain

ROADMAP now runs four tracks in order: backend B0–B9, frontend F0–F7, landing L1, deploy and maintain O1–O3. Frontend no longer overlaps backend, so the frontend builds against a finished API contract. **Why:** the contract is the highest-traffic seam (contract-first, ARCHITECTURE §1), and building UI against it before it stabilises causes rework. **Cost:** the estimated beta moves from late February 2027 to late July 2027 at two engineers. **How to apply:** a backend phase is done when every `docs/API.md` row for it is ✅ with contract and cross-user tests; the frontend starts only after the backend gate (B9). Frontend F0 may start early only if the plan is changed here first.

### D-029 · 2026-10-22 · active — An installation links to a user only through GitHub's own list

The setup route links an installation only when `GET /user/installations`, called with the signed-in user's GitHub token, lists it. The first Replo account to link an installation owns it; another account gets `owned_by_another_user`. **Why:** installation IDs are not secret, so a link taken from the query string alone would let anyone claim someone else's installation. **How to apply:** never bind an installation from a query parameter or a state value alone. Taking over an installation (for example after an org admin changes) needs a new decision here.

### D-030 · 2026-10-22 · active — Preflight reads the Git Trees API and returns no estimates yet

`repositories.preflight` summarises the pinned tree (files, bytes, languages, framework) and refuses by cap or language before any model call. Its `estimates` array is empty until B4 can price a run from the static index. **Why:** estimates need the index and the model catalogue, and an invented number would misstate the user's own bill (ADR-007). **How to apply:** fill `estimates` only from the static index and the catalogue; never hard-code a figure.

### D-031 · 2026-10-22 · active — Public tutorials' delete-or-anonymise choice moves to B8

`me.deleteAccount` removes everything the user owns through cascades, public tutorials included. PRD FR-AUTH-3 asks for a user choice between delete and anonymise; until B8 the only behaviour is delete. Anonymise needs `tutorials.user_id` to be nullable (an expand migration), and the tutorials module does not exist before B6. **How to apply:** when B8 lands, add `publicTutorials: 'delete' | 'anonymise'` to `me.deleteAccount` and make the column nullable in a new migration (expand, never regenerate `0000`).

### D-032 · 2026-10-22 · active — Jobs are enqueued inside the import transaction through pg-boss

`repositories.import` writes the repository link, snapshot, job row and `job_events` row, then calls `pg-boss` `send` with a transaction-bound executor (`platform/queue/job-queue.ts`). The queue row therefore commits or rolls back with the job. The executor binds pg-boss's numbered placeholders to Drizzle values, and `undefined` becomes `NULL` (dropping it produced invalid SQL). **Why:** RULES §4 forbids a job row without its queue message, and the reverse. **How to apply:** only `modules/generation` enqueues; any new enqueue goes through `JobQueue.send` with `tx`. The rollback test in `generation.integration.test.ts` checks the queue size before and after.

### D-033 · 2026-10-22 · active — `tar-stream` 3 reads GitHub tarballs

Chosen over `tar` 7 because its async iterator maps one entry at a time onto the stream, which keeps the per-entry guard simple. It is streamx-based, so the archive module wires node streams by hand and destroys all streams on error (node's `pipeline` does not drive streamx). The package ships its own types, so `@types/tar-stream` is not used. **How to apply:** keep the archive reader's error path (`abort`) and the hostile-archive tests in `archive.test.ts` when touching it.

### D-034 · 2026-10-22 · active — Snapshot content lives on local disk until B3

`indexing.ingest` extracts accepted text (≤ 1 MB, not LFS, not binary) to `SNAPSHOT_DIR/<snapshotId>` (default: the OS temp dir under `replo-snapshots`). Metadata goes to `snapshot_files`. A snapshot already `ready` is never downloaded again. **Why:** no object store is wired yet, and B3 needs file contents. **How to apply:** B3 must cope with a missing directory (re-ingest, keyed by snapshot). Retention and deletion belong to B9. Two workers on one snapshot would race, so `WORKER_CONCURRENCY` stays at 1 until snapshot claiming exists.

### D-035 · 2026-10-22 · partly superseded by B3 — Jobs stop at `summaries` until B4; the outline fixture waits for the model stages

B2 delivers ingest for real and B3 delivers index. `summaries`, `architecture`, `outline`, `lessons`, `validate` and `publish` still fail with `STAGE_NOT_IMPLEMENTED`. The recorded-fixture outline (ROADMAP B2) needs the model stages, so it moves to B4–B6. **Why:** a fake outline before the index would pass M1 on paper only. **How to apply:** M1 counts as reached when the outline stage passes on recorded fixtures after the model stages land.

### D-036 · 2026-10-22 · active — Model plans are placeholders until B4

Import writes `models` with empty model ids and `summarizer`/`judge` set to `null`, and `estimate` is `{0, 0}`. `provider`, `preset`, `pipeline` (from the lite cap) and `budgetMicros` are real. **Why:** model choice and pricing belong to B4 and B5, and inventing numbers would misstate the user's bill (ADR-007). **How to apply:** B4 must fill `models` from the registry and the static-index estimate before any stage reads them.

### D-037 · 2026-10-22 · active — Parsing uses `web-tree-sitter` with grammars from `@vscode/tree-sitter-wasm`

Checked against the dependency checklist (RULES §8): both packages are MIT and have no install scripts. `web-tree-sitter` 0.27 loads the 0.25-era TypeScript, TSX and JavaScript grammars from `@vscode/tree-sitter-wasm` 0.3.1. The grammar npm packages with native bindings (`tree-sitter-typescript`) were rejected because they run `node-gyp-build` on install, which `strictDepBuilds` would block. `tree-sitter-wasms` was rejected for size (about 50 MB, every language). **How to apply:** the grammar path is resolved from `node_modules` at runtime, so the deployed image must ship `node_modules` (or the grammar files) next to the bundle. Bump `ANALYZER_VERSION` whenever a grammar or the extraction rules change.

### D-038 · 2026-10-22 · active — The index stores entry points, routes and metrics as one JSON document per snapshot

`repo_snapshots.analysis` holds the analyzer version, framework, entry points, routes, per-file metrics, unresolved import count and files with syntax errors. Symbols and import edges are rows (`symbols`, `file_edges`) because the requirements query them. **Why:** entry points and routes are read as a whole and are cheap to recompute, so a table per concept would add joins without queries that need them. **How to apply:** a re-index replaces all three in one transaction. Analyzer version is part of the snapshot identity, so a bump re-indexes into the same snapshot row.

### D-039 · 2026-10-22 · active — Analysis is syntactic, and its known gaps are accepted for B3

Call edges are not resolved, so "who calls X" is not an edge yet (blueprint §7.5 calls these "likely", not proven). Express and Fastify routes are found by the receiver's constructor (`express()`, `Router()`, `Fastify()`); route prefixes from `app.use('/api', router)` are not composed onto child routes, so child routes keep their local paths. Workspace packages: superseded by B5: names and subpaths of workspace packages now resolve, and each member package contributes its own entry points. `module.exports` names and `export default` expressions do not produce symbols. Heuristic framework gating: Next.js routes only when the framework is Next.js; React Router route config only when the framework is React Router. **How to apply:** do not present these as complete; B6 and B7 must treat unresolved references as unverified, not absent.

### D-040 · 2026-10-22 · active — Golden fixtures are synthetic until B5

Six small repos live in `packages/repo-analysis/fixtures/` (Next.js app router, Next.js pages, React Router, Express, Fastify, plain library with a syntax error and an unresolved import). Each has hand-written entry-point, route and edge assertions, plus a reviewed snapshot. The ten real golden repos with truth sheets are B5. **How to apply:** when a fixture changes, review the snapshot diff by hand before updating it.

### D-041 · 2026-10-22 · active (OpenRouter part superseded by D-083) — The model catalogue is versioned data; unverified prices block presets

`packages/ai/catalog/model-catalog.json` lists providers, tiers (frontier, mid, cheap) and models with prices, `verified` and `priceSource`. The loader validates it with Zod and checks that every tier names a model of its own provider. Anthropic prices come from the team registry (`DEFAULT_REGISTRY`). OpenAI prices come from a web-search summary of the official pricing page, undated. Google prices come from the Gemini pricing page dated 19 Oct 2026. OpenRouter slugs and prices are **unverified**: the models API fetch returned a summary that contradicted itself, so those entries carry `verified: false` and null prices, and any preset that needs them refuses with `PRESET_UNAVAILABLE`. The `free` preset has an empty allow-list until the B5 eval gate names models. Structured-output support is an assumption until B5 evals run. **Why:** prices and model lists are config (RULES §6); a wrong price would misstate the user's bill. **How to apply:** re-verify each `priceSource` on the live pages before launch; set `verified: true` only with a dated source.

### D-042 · 2026-10-22 · active — Keys are checked with a free model-list call; redirects are refused

`keys.add` and `keys.validate` call the provider's model list (OpenRouter's key-info route), which spends no tokens. 401 and 403 mean invalid; any other failure means "could not check" and stores nothing (`KEY_CHECK_UNAVAILABLE`). Requests set `redirect: 'error'`, so the key cannot be sent to another host. The key goes only in a header, never in the URL. `repositories.import` validates the key again before it creates the job, which satisfies "invalid key fails before the job". **How to apply:** do not store an unchecked key; do not add a provider or base URL that the user can set (D-020).

### D-043 · 2026-10-22 · active — Run estimates are assumptions over the static index, and the budget is a hard ceiling

`estimateRun` (in `packages/ai`) uses fixed shapes per pipeline: lite is 12 requests and full is 40, with per-request input capped at 30k and 60k tokens, output 3k and 4k tokens, and roles split 20/70/10 across planner, author and summariser. Costs use catalogue prices. Output says `basis: static-index-and-catalogue-assumptions`. The job's budget ceiling is the user's `budgetUsd` (default $2). Import refuses when the estimate exceeds the ceiling. The lite pipeline applies to `free` and `budget`, and refuses repositories over the lite cap. **Why:** the shapes are guesses until real runs exist, so they must be labelled and replaced with measured numbers after the first runs. **How to apply:** replace the constants with measured tokens per stage after B6; keep the basis label until then.

### D-044 · 2026-10-22 · active — Deleting a key fails its jobs in the same transaction, and the worker stops on its next heartbeat

`keys.delete` runs one transaction. It marks every active job on the key `failed` with `KEY_REMOVED`, records a notification for each, and then deletes the key, so `generation_jobs.key_id` becomes null. Running workers see `stopped` on their next heartbeat (a 15 s interval) and abort without writing a status, because the deletion already did. Queued pg-boss messages find the job failed and do nothing. Nothing retries on another key. **How to apply:** any new terminal transition must go through the same rule: write the status and the notification together. The worker stops at the next stage boundary or heartbeat, so the key's plaintext can stay in memory for at most one heartbeat after deletion.

### D-045 · 2026-10-22 · active — The live outline waits for B6; B4 provides the verified call path

ROADMAP B4 lists "live outline on the user's key". The outline depends on the summaries and architecture stages, which are B4–B6 work, so a live outline now would be a second pipeline. B4 delivers the call path instead: `generateStructured` with budget reserve and settle, provider fallback only on retryable errors, and a usage sink into `llm_calls`. Those are tested with the AI SDK mock model and with the Postgres ledger. **How to apply:** B6 must wire the outline stage through this path, and remove the B2 fixture then.

### D-046 · 2026-10-22 · active — The golden set is ten synthetic repos until real ones are reviewed

ROADMAP B5 asks for ten golden repos. The set is the six fixtures from B3 plus four new ones (`redux-spa`, `monorepo`, `cli`, `legacy-js`), covering the blueprint's shapes. Each has a `truth.json` in `tools/evals/golden/`. Their index expectations were checked against the source by hand, and the analyzer then matched them, so the index baseline guards against regressions and does not measure accuracy on real code. Real public repos (pinned SHA, person-written sheets) are the next step and must not be committed with private code. **How to apply:** do not quote index accuracy as a result until real repos are scored.

### D-047 · 2026-10-22 · active — Model probes measure what the system can check, and the gate thresholds are provisional

A probe shows a model the file list and scripts of a golden repo (never the truth sheet) and asks for entry points and routes. Each answer is scored for schema validity, reference validity before validation (share of returned paths that exist), fabricated paths, entry recall, route recall, latency and cost. The gate (`tools/evals/src/gate.ts`) requires schema validity ≥ 0.9, reference validity ≥ 0.95, entry recall ≥ 0.6 and at most 0.2 fabricated paths per call. These numbers are provisional and must be set from the first real runs. **Why:** "the model points, the system quotes" (RULES §0.5): what a model returns is checkable against the index, and that is the measurable part before B6. **How to apply:** change `GATE` only with a MEM entry and a before/after run.

### D-048 · 2026-10-22 · active — No nightly eval and no live model keys in CI

The team decided that a nightly eval run is not required. CI runs `pnpm --filter @replo/evals smoke` on every change: the index is checked against the committed baseline, and the recorded model answers go through the allow-list gate as a dry run. No provider key is stored in CI, and no workflow runs on a schedule. **Why:** a nightly run that calls live models would need an operator key in CI secrets, which conflicts with ADR-007's rule that the platform holds no provider keys. **How to apply:** a model's place on the free allow-list changes only by a person running the gate with real answers and recording the result here. Do not add a scheduled eval or a CI secret for a provider without a new decision in this file.

### D-049 · 2026-10-22 · active — Provider failures must never count as bad answers

No live completer exists in the harness today; probes read recorded answers. The rule holds for any live completer added later: auth, rate-limit, outage and budget failures abort the run, and only a schema failure scores as an invalid answer. **Why:** an outage must not remove a model from the allow-list (RULES §6). **How to apply:** test a new error class before it is scored.

### D-050 · 2026-10-22 · active — Pipeline checkpoints keep intermediate outputs in `job_stage_outputs`, purged on publish

Each LLM stage writes its output (summaries, architecture, outline, one chapter's lessons, validated content) to `job_stage_outputs` keyed by `(job, stage, unit)`. Publish clears them after the commit, and the retention job purges leftovers (D-059). **Why:** a crash resumes from the checkpoint without re-spending on finished chapters (FR-GEN-2). The outputs are completions for private repos, so they are deleted as soon as the job no longer needs them (NFR-SEC-6). **How to apply:** a new stage writes its output before it returns, and reads it back through the stage output store, parsed with zod. Do not keep prompts or completions anywhere else.

### D-051 · 2026-10-22 · active — Grounding policy: downgrade, drop, repair once

Evidence is resolved from the index: path, then symbol key (or same-file name), then a quote matched after whitespace normalisation (≥ 8 characters, inside the symbol range when a symbol is given). An `observed` claim with no resolvable evidence becomes `interpretation` (FR-GRD-3). A backticked identifier unknown to the repository drops the whole block. Unresolvable code blocks, diagrams with no verified hop, and quiz questions without evidence are removed. Every lesson with failures gets one repair call (author role), then the policy above applies. **Why:** the model points and the system quotes (RULES §0.5); the repair is bounded to keep the budget predictable. **How to apply:** do not add a path where a model claim survives unresolved; the report counts what was dropped.

### D-052 · 2026-10-22 · active — Confidence and the draft threshold are provisional

`verifiedClaimRatio` = observed claims that still have resolved evidence after the policy ÷ observed claims (and questions) the model produced. `confidence` = ratio × mean judge score (1 when no judge runs, as in lite). A tutorial publishes as a draft when confidence < 0.8 or a lesson has no blocks left (FR-GEN-8). `referenceValidity` is measured before validation, so it shows how often the model's pointers resolved on their own. **How to apply:** change `DRAFT_CONFIDENCE` only with a before/after eval run recorded here.

### D-053 · 2026-10-22 · active — Diagrams use a restricted Mermaid grammar; structural diagrams come from the graph

Model-authored diagrams accept only `flowchart`/`graph` headers, plain node declarations with `[label]`, `("label")` or `(label)`, and `-->` edges with an optional `|label|`. Anything else (subgraphs, `click`, `style`, HTML, directives) fails the block. Each node maps to a repository path in `nodeRefs`, and each edge must be a real file edge between those paths, or it is dropped (`UNVERIFIED_HOP`). The architecture diagram is generated from source groups and their import edges, never by the model (FR-GEN-7). **How to apply:** labels never carry quotes or markup; the renderer rebuilds the Mermaid text from the parsed graph.

### D-054 · 2026-10-22 · active — One tutorial per user and repository; slugs are unique per repository

`tutorials` is unique on `(user, repository)`, and a new job adds a version. The slug comes from the repository name, is unique per repository, and never changes once assigned (FR-SHR-5). A version is linked to the job that made it through `generation_job_id` (unique), so a replayed publish returns the existing version. `tutorials.user_id` is nullable only for anonymised public tutorials (D-031). **Why:** public URLs `/tutorials/{owner}/{repo}/{slug}` must resolve to one tutorial. **How to apply:** a second import of the same repo is a new version, not a new tutorial.

### D-055 · 2026-10-22 · active — Public tutorials need an OSI-approved licence in a static list

`isOsiApproved` checks the repository's SPDX id against a fixed list in `modules/tutorials/licences.ts` (FR-SHR-3). `NOASSERTION` and null are refused. **How to apply:** a new licence enters the list only through a reviewed change here.

### D-056 · 2026-10-22 · active — Link shares use an unguessable token checked in constant time

`link` visibility requires the token (24 random bytes, base64url), compared with `timingSafeEqual`. `createShareLink` returns `{PRODUCT_ORIGIN}/tutorials/{owner}/{repo}/{slug}?share=…`. Switching to `private` clears the token. Every read goes through the same viewer rule, so a private tutorial answers NOT_FOUND to everyone but its owner (FR-SHR-1, RULES §0.4).

### D-057 · 2026-10-22 · active — Learner chapters never carry the answer key; progress carries over by lesson key

`getChapter` returns quiz questions without `correct` or `explanation`. The key arrives only in the `submitQuiz` result (FR-LRN-5, D-022). Progress is stored per version, but a lesson counts as completed for any version of the same tutorial that has the same lesson key (FR-LRN-6). **How to apply:** do not add a read path that returns the key before an attempt.

### D-058 · 2026-10-22 · active — Rate limits are per process and in memory

Fixed-window counters in `platform/rate-limit.ts` cover import (20/h), key add (30/h), key validate (60/h) and sign-in (20/min per IP). The key is the session user when signed in and the client IP otherwise. A global IP limit (300/min) stays in place. Over-limit requests get 429 with `Retry-After` (NFR-SEC-7). **Why:** one VPS in R1. **Gap:** a second API instance would need a shared store (Postgres or Redis) before limits are exact. Origin checking covers every state-changing request except `/webhooks/github`, which is authenticated by HMAC instead (NFR-SEC-4). Every JSON error body carries `requestId`, and the response echoes `X-Request-ID` (NFR-OBS-2).

### D-059 · 2026-10-22 · active — Retention windows

Daily purge at 03:00 (pg-boss schedule `purge-retention`): `job_events` and `llm_calls` older than 90 days; checkpoints of succeeded jobs after 1 day, and of failed or canceled jobs after 30 days (the retry window, FR-GEN-11); snapshots older than 1 day that no job or tutorial version references, with their directories. Notifications follow the same 90-day rule; the purge is wired into the daily run (25 Oct 2026). Tarballs are streamed and never persisted, so there is nothing to purge for them (NFR-SEC-6).

### D-060 · 2026-10-22 · active — Operator access is a row in `operators`, and non-operators get NOT_FOUND

The operator screen reads jobs, stages and LLM calls through the generation service. Each procedure checks the `operators` table first and answers NOT_FOUND to everyone else, so the screen does not reveal itself (FR-OPS-1). **How to apply:** grant access by inserting a row, never through a request.

### D-061 · 2026-10-22 · active — Account deletion chooses delete or anonymise for public tutorials

`me.deleteAccount` takes `publicTutorials: 'delete' | 'anonymise'` (default `delete`). Anonymise sets `user_id` to null on public tutorials, then deletes everything else in one transaction. Private tutorials and their progress are deleted either way (FR-AUTH-3, MEM D-031).

### D-062 · 2026-10-22 · active — Push events mark tutorials stale; only the default branch counts

A `push` to the repository's default branch with changed paths is stored in `repo_push_events` inside the webhook's dedupe transaction. A tutorial is stale when a push later than its snapshot touched a path it cites (FR-IMP-9). Pushes to other branches, unknown repositories, and pushes with no changed paths are answered 200 and skipped. **Gap:** no automatic regeneration (FR-GEN-10 is after validation).

### D-063 · 2026-10-22 · active — Test databases

Local DB suites run against an embedded Postgres 18 binary (the npm `embedded-postgres` package), because no Docker is available here. The suites migrate on start and truncate shared tables, so each parallel run needs its own database. CI still targets Postgres 17 as in `docs/DATABASE.md`; the migrations use only features common to both (`pg_trgm`, `gin`, `uuid`).

### D-064 · 2026-10-22 · active — No comments in code

Source files carry no comments: names, types and tests say what the code does, and the reasons live in this file and in `docs/`. Generated SQL under `apps/api/drizzle` is exempt. Found by the backend review in `docs/CODE_REVIEW.md`, which also lists the open follow-ups.

### D-065 · 2026-10-22 · active — One service per role, wired in dependency order

A module exposes several small services instead of one large one (tutorials: publisher, reader, library, manager; generation: jobs, runtime, history; repositories: library, imports, changes, sources). A service depends on another through `Pick<…>` of the methods it calls. `composition.ts` builds them in dependency order with no closures over services created later; a dependency that would close a loop is cut by moving the shared method into a smaller service (for example `RepositorySources.ingestSource`).

### D-066 · 2026-10-23 · active — Import requires an `Idempotency-Key`

`repositories.import` refuses a request without the header (`IDEMPOTENCY_KEY_REQUIRED`). The handler used to mint a random key when none was sent, so a retried request started a second run and spent the user's key again. **Why:** the key is the only protection against duplicate paid jobs. **How to apply:** the client creates one key per import attempt and reuses it on retries. Resolved in F1: `createIdempotencyKeys` (`apps/product/src/lib/idempotency-key.ts`) reuses the key while the payload is unchanged, and the oRPC link adds the header only when a call supplies one.

### D-067 · 2026-10-23 · active — Backend comments are blocked by lint

`replo/no-comments` (`packages/config/eslint`) is part of the backend ESLint configs (`apps/api`, `packages/contracts`, `packages/ai`, `packages/repo-analysis`, `tools/evals`) and fails on any comment. D-064 is still the rule; the lint rule keeps it. Frontends and `packages/ui` are covered from D-070. **How to apply:** do not add an ESLint disable directive to get around it; record an exception here first.

### D-068 · 2026-10-23 · active — Frontend CSP is per request, set by `src/proxy.ts`

`lib/csp.ts` builds the policy: `script-src` and `style-src` take a per-request nonce with `'strict-dynamic'` for scripts, `connect-src` allows only the API origin, and `frame-ancestors` is `'none'`. The root layout awaits `connection()`, so every page renders per request and Next can apply the nonce; a statically prerendered page has no request to take a nonce from (Next's CSP guide). **Why:** NFR-SEC-4 (web). **How to apply:** development adds `'unsafe-eval'` and inline styles (React debugging and the dev overlay). `upgrade-insecure-requests` is sent only when the app URL is https, because on http it would upgrade the localhost API calls to https and break them. Trusted Types are not enabled (SECURITY.md #11).

### D-069 · 2026-10-23 · active — Links are anchors, not Base UI buttons

Base UI's `useButton` sets `role="button"` on every non-native element, so `<Button render={<Link />}>` was announced as a button, not a link. `Button` no longer accepts `render`. The product uses `LinkButton` (`src/components/link-button.tsx`, `next/link`). Landing, which may import only `@replo/ui`, uses `buttonVariants` on a plain anchor, or `Link` for hash links. **How to apply:** `Button` is for actions; anything that navigates is a link.

### D-070 · 2026-10-23 · active — Frontend code has no comments either

`replo/no-comments` runs in `apps/product` and `packages/ui`, so D-064 now covers the frontends too. CSS files carry no comments. Landing has no such rule yet: its one JSDoc was removed in the same pass, and the rule joins landing's lint in L1. **How to apply:** explain behaviour through names, types and tests.

### D-071 · 2026-10-23 · active — The browser parses shared contract schemas at its boundaries

Frontends import runtime Zod schemas from `@replo/contracts` (`ImportRepositoryInput`, `RepositorySource`, `AddKeyInput`, `JobEventDto`) for form validation and for parsing SSE payloads, so one schema describes both sides. RULES §1 limits the product's use of contracts to types for the API client; the client itself stays type-only. **Why:** RULES §3 requires a Zod parse at every boundary. **How to apply:** a new shared shape goes into contracts, not into the app.

### D-072 · 2026-10-23 · active — F0 defers renderers that have no consumer yet

The allow-list Markdown renderer, its link policy and the lazy Mermaid, CodeMirror and Shiki loaders move to F3, where lessons first use them. Building them in F0 would leave unused code behind. **How to apply:** the link policy (repo permalinks and allow-listed domains) lands with the renderer, not before.

### D-073 · 2026-10-23 · superseded by D-074 — Browser tests run on the dev server with recorded API responses

Playwright (`apps/product/e2e`) starts `next dev` on port 3101 and answers oRPC calls through `page.route`, using responses in `e2e/fixtures/recorded.ts`. The fixtures are written to the contracts by hand; they are not captured from a live API, and the staging run in the F-phase DoD is still open. Port 3001 is held by an unrelated local process, so the e2e origin moved. **How to apply:** update the fixtures whenever a contract changes, and replace them with captures from staging before treating them as coverage of the live API.

### D-074 · 2026-10-25 · active — Browser tests run the production build against a mock API

Playwright (`apps/product/e2e`) builds the product, starts the standalone server through `scripts/start.ts` on port 3101, and starts a mock API on port 4100 from `globalSetup`. Server-rendered pages call the API from the Next server, which browser interception cannot see, so the mock serves the same recorded responses (`e2e/fixtures/handlers.ts`). Per-test behaviour is set with `page.route` overrides. **Why:** the production build is the only place the nonce CSP runs as shipped, and the public pages must be tested as the server renders them. **How to apply:** when a contract changes, change the fixtures in the same change; a test that passes against stale fixtures proves nothing.

### D-075 · 2026-10-25 · active — Tutorial URLs are `/tutorials/{owner}/{repo}/{slug}`

PRD FR-SHR-5 and `docs/API.md` name this path, so the `/t` routes moved. Learning URLs nest below it: `/learn/{chapterKey}/{lessonKey}`, with `?ref=` for the active source reference and `?share=` for link shares. **How to apply:** build tutorial links with `tutorialPath` and `lessonPath` (`src/lib/tutorial-paths.ts`), never by hand.

### D-076 · 2026-10-25 · active — Heavy renderers load on demand and write styles through the CSS object model

The CSP has no `unsafe-inline` for styles and no `wasm-unsafe-eval`, so three things follow. Shiki uses its JavaScript regex engine, because the WASM engine needs `wasm-unsafe-eval`. Token colours go through the custom properties `--shiki-light` and `--shiki-dark`, set from React, so no `style` attribute is written into markup. Mermaid's SVG is parsed in an inert document, its inline styles are moved into the CSS object model, and its `<style>` blocks are adopted as constructable stylesheets (`features/diagram/render-mermaid.ts`). Both libraries start when their element first scrolls into view. **How to apply:** do not add inline `style` props to server-rendered markup; use classes, or set styles after mount.

### D-077 · 2026-10-25 · active — Operator access is decided before the client shell

`app/operator/layout.tsx` asks the API for the operator list and calls `notFound()` if the answer is refused. It sits outside the `(app)` group, so the status code is 404 and not a 200 with a not-found page. **Why:** a streamed not-found inside the client shell still returns 200. **How to apply:** any server-side access decision goes in a layout or page outside client components.

### D-078 · 2026-10-25 · active — Player layout is kept per browser

The resizable panel sizes are stored in `localStorage` under `replo.player.layout` and read back through a Zod schema, so a corrupt value is ignored. This is a per-viewer convenience (the artifact rule), not account state. The lesson screen uses the native `<details>` element for chapters, so the outline works without script.

### D-079 · 2026-10-25 · active — Known gaps at the F7 gate

Not done, and not claimed: a full repository tree for the source explorer (resolved by D-080); the staging run of every F-phase Playwright step; a "system" theme option (the contract offers only light and dark); Trusted Types (SECURITY.md #11); virtualised long files (a 1,000-line window is used instead). Resolved on 25 Oct 2026: notification counts are pushed over SSE (D-081), and Lighthouse accessibility on the player is 1.00 locally (best practices 0.92 from D-084).

### D-080 · 2026-10-25 · active — The repository tree is read from `snapshot_files`

`tutorials.sourceTree` lists every file recorded in the pinned snapshot, sorted by path, with its size, language, role and a `readable` flag. The flag is not stored: it is `decideFile(path, size).keepContent` from the indexing file policy, the same rule that decides whether the text is kept on disk. The tree uses `getSource`'s visibility rule (owner, public, or a valid link token), and foreign tutorials return NOT_FOUND. **Why:** the explorer needs the whole tree (FR-LRN-8), and the rows already exist, so no migration or disk walk is needed. **How to apply:** the list is bounded by the ingest caps (about 5,000 files), so it is returned whole and not paged. If the file policy or its size cap changes, bump `ANALYZER_VERSION` so snapshots built under the old rule are re-indexed, or the `readable` flag will disagree with the disk.

### D-081 · 2026-10-25 · active — The unread count has its own stream, `GET /notifications/stream`

The API pushes the unread count as an `unread` SSE event on connect and whenever it changes. The check runs every 5 s per open stream, with a keep-alive comment about every 15 s. A user may hold at most five streams (`429 TOO_MANY_STREAMS`, `Retry-After: 60`), and a request without a session gets 401. The bell subscribes to it and polls every 30 s only while the stream is down. **Why:** `API.md` first said the job progress stream would carry the count, but the bell sits on every page and no job is open there, so a user-scoped stream fits. **Cost:** one `COUNT` per open stream every 5 s. Move to LISTEN/NOTIFY or a shared store before more than a few hundred concurrent users (with D-058). **How to apply:** new pushes use `platform/sse.ts`; keep the stream tests (`notifications.stream.integration.test.ts`) passing.

### D-082 · 2026-10-25 · needs confirmation — No enqueue-time budget reservation

ROADMAP B6 asked for the budget to be "reserved at enqueue". The implementation does not reserve. It refuses at import when the estimate exceeds the ceiling (D-043), checks the budget before each call, settles after it, and carries spend across retries in `generation_jobs`. **Why:** RULES §4 says the per-job budget is in-process and needs no counter table. The spend is the user's own key, so no other job competes for it, and a reservation counter would add a shared row with no shared resource to protect. **How to apply:** if the team wants a hard reservation, add an atomic `UPDATE … WHERE used + n <= limit` counter in a new decision and migration. The owner should confirm this reading before the B6 status is treated as final.

### D-083 · 2026-10-25 · active — OpenRouter slugs and prices are verified (supersedes the OpenRouter part of D-041)

`packages/ai/catalog/model-catalog.json` now holds the three OpenRouter models read from `https://openrouter.ai/api/v1/models` on 25 Oct 2026: `anthropic/claude-opus-5.5` ($4 in / $20 out per MTok), `anthropic/claude-sonnet-5.5` ($2 / $10) and `anthropic/claude-haiku-5.5` ($0.10 / $0.50). All three list structured outputs. The prices match the Anthropic direct prices in the catalogue. The `budget`, `balanced` and `quality` presets now resolve on OpenRouter. `free` still refuses, because its allow-list stays empty until a real eval-gate run passes (D-048). **How to apply:** re-read the list before launch, since prices change, and update `priceSource` with the date.

### D-084 · 2026-10-25 · open — The strict CSP blocks inline `style` attributes from three sources

Production headers use `style-src 'self' 'nonce-…'`, so a `style` attribute cannot be applied. On the lesson player these come from Next's route announcer, the resizable panel library and Mermaid's SVG output. The browser logs a CSP violation for each one. The layout still renders on desktop, and Lighthouse's best-practices score is 0.92 because of it. **Options:** (a) keep the policy and patch or replace the sources, or (b) add `style-src-attr 'unsafe-inline'`. A style attribute cannot run script, so (b) is a defensible weakening, but NFR-SEC-4 says strict CSP. The owner must choose; until then the policy stays as it is.

### D-085 · 2026-10-25 · active — Landing content is TSX; policy pages are drafts until reviewed

`apps/landing` uses TSX content pages, not MDX, so no dependency is added (D-008 was written for MDX once there is content, and the team can revisit it). The key guide lives at `/keys/`, next to the "Your key" label. Policy pages (privacy, terms, licence, takedown) each carry "Draft. Reviewed before launch." and name no operator, address or contact address. The only contact channel is the in-product report form. The landing's no-comments lint rule is on (`replo/no-comments`, closing the D-070 follow-up). `serve` is pinned to 14.2.6 in the start script. `public/_headers` keeps `script-src 'unsafe-inline'`, because Next's static output needs inline bootstrap scripts and Cloudflare `_headers` cannot carry build-time hashes. **How to apply:** before launch, the founder must decide the operator details and counsel must review the terms, privacy and licence wording (open items).

### D-086 · 2026-10-26 · active — Own auth replaces Better Auth (ADR-009)

Sign-in is GitHub, Google, or email and password, all in `modules/identity`. A session is an opaque token in the `replo_session` cookie, and only its hash is stored in `session`. Each provider link is one `auth_identity` row per user and provider. **Why:** Better Auth's schema and cookie contract were not ours to shape, and the product needs a sealed GitHub token and its own linking rules. **How to apply:** do not reintroduce Better Auth. Read the session through `sessionFromRequest` (one lookup per request). Write identities only through `auth.service.ts`. Procedures take the user from the session, never from input.

### D-087 · 2026-10-26 · active — A provider login merges only into a verified account

`signInWithProvider` links to an existing account only when the provider verified the email and the account's own email is verified. A password account is never verified (there is no mail yet), so a Google or GitHub login with the same email gets `ACCOUNT_EXISTS`, and the user is told to sign in with the password and connect the provider in Settings. A link from Settings (`intent=link`) marks the account's email verified when the provider's verified email matches. **Why:** otherwise someone who signs up with a victim's email and a password could later be merged with the victim's real provider login. **How to apply:** keep `emailVerified` true only where a provider or a verification flow proved it. When email verification lands, set it there and revisit `ACCOUNT_EXISTS`.

### D-088 · 2026-10-26 · open — Private-repo access from GitHub sign-in needs an ADR-005 decision

The request is that a user who signs in with GitHub can import private repositories, and everyone else sees public repositories only (FR-AUTH-5). Today private repositories come only from a GitHub App install (D-029), and linking an install needs a GitHub login token. A login alone grants private access only through an OAuth App token with the `repo` scope. ADR-005 accepted a read-only GitHub App and rejects an OAuth App for private source. The options: (A) switch the GitHub login to an OAuth App with `repo`, which grants private access on sign-in, supersedes ADR-005, and gives a write-capable token that the code would only read with; (B) keep the App, so GitHub login stays a prerequisite and the install grants access; (C) request the install during sign-in with the App's user token. **Why open:** it changes the security posture for the most sensitive asset. **How to apply:** nothing changes until the owner picks an option. Then write ADR-010 or amend ADR-005, and update D-029 and FR-AUTH-5. The profile copy "Connect GitHub to import private repositories" holds under every option, because a GitHub connection is needed in each one.

### D-089 · 2026-10-26 · active — Migration 0009 replaces the Better Auth tables and keeps GitHub links

`0009_custom_auth` creates `auth_identity`, copies each `account` row with provider `github` into it without its token (Better Auth sealed tokens with its own secret, so they cannot be reused), then drops `account`, `verification` and the old `session`, and creates the new `session`. Nothing is deployed yet (O1 is open), so no production sessions or accounts exist. **How to apply:** a user with a carried-over GitHub link sees `github_not_linked` until they sign in with GitHub once more. For a future table replacement, `drizzle-kit generate` asks rename questions that need a TTY: write the SQL by hand, and generate the snapshot with `generateDrizzleJson` from `drizzle-kit/api`.

## Assumptions to validate (from blueprint §20)

1. Developers get oriented measurably faster than with DeepWiki/Code Wiki.
2. Lite tutorials (the `free` preset on an OpenRouter key) are good enough to hook new users.
3. Users will add a key during onboarding when they see the OpenRouter recommendation and its `:free` models. ADR-007 depends on this.
4. Public tutorials attract enough organic readers to grow sign-ups without ads or paid acquisition.
5. One 4 GB server handles launch traffic and generation.

## Gotchas / things to re-verify when implementing

- **Migration `0003` drops `model_preferences.default_budget_usd`** and adds `default_budget_micros`. The table was never written, so no data is lost; drizzle asked a rename question, which was answered as create-and-drop.

- **Blueprint code is a sketch.** Re-check against installed types: oRPC Fastify adapter options; pg-boss v10 (`createQueue` required before `send`/`work`; `work` handlers receive an **array** of jobs); AI SDK 6 `generateText` + `Output.object`; OpenRouter provider major vs AI SDK major; Better Auth schema generation for the Drizzle adapter.
- **pnpm 11 install failures:** `ERR_PNPM_IGNORED_BUILDS` ⇒ decide `true`/`false` per package in `allowBuilds` (D-011); `ERR_PNPM_NO_MATURE_MATCHING_VERSION` ⇒ lower the range floor (D-010).
- **TypeScript 6:** `types` defaults to `[]` — each tsconfig must list `"types": ["node"]` where needed (set in `packages/config/tsconfig.node.json` / `tsconfig.next.json`).
- **pg-boss 10.4:** `import PgBoss from 'pg-boss'` (default import); `createQueue(name, { name, … })` requires `name` in the options object; `work` handlers receive an array.
- **Base UI `Button`** forces `role="button"` on non-native elements, so it must not render links (D-069). `packages/ui` `Button` no longer takes `render`.
- **Fastify + pino typing:** pass `loggerInstance` typed as pino `Logger`; route modules take `app: App` from `platform/http.ts` (plain `FastifyInstance` is not assignable).
- **Typed oRPC errors return HTTP 500 here.** The contracts declare them as `{}`, so the status defaults to 500 (`INVALID_CREDENTIALS`, `EMAIL_TAKEN`). The product reads the `code`, so the UI is right, but monitoring counts them as server errors. Set a `status` per error in the contract if that matters.
- **Auth cookies:** `replo_session` is host-only unless `AUTH_COOKIE_DOMAIN` is set. The OAuth attempt cookie (`replo_oauth`) is scoped to `/auth` and expires after 10 minutes. Sign-up and sign-in are rate limited to 20 per minute per IP on `/rpc/auth/signUp` and `/rpc/auth/signIn`.
- **`tsdown`** inlines workspace packages (`noExternal: [/^@replo\//]`) and also pulls `@orpc/contract` into the bundle (harmless; hint only).
- Next.js 16: `next lint` is gone (run ESLint directly); `middleware.ts` is now `proxy.ts`.
- Landing `output: 'export'` forbids route handlers, `headers()`/`cookies()` and ISR.
- GitHub installation tokens: treat as opaque strings (stateless format rolling out since 27 Apr 2026).
- OpenRouter `:free` models: 20 req/min; 50/day, or 1,000/day after a one-time $10 credit purchase, **per OpenRouter account**. Under BYOK each user's own account has these limits, so the key guide must say so.
- `uuidv7` for primary keys (app-side `uuidv7` package; Postgres 18 has native `uuidv7()`).

- **DB tests are skipped without `TEST_DATABASE_URL`.** A green `pnpm test` with the variable unset says nothing about the database. The suites truncate tables, so the URL must point at a disposable database (CI service, or `pnpm infra:up` with a fresh name).
- **Installation links are per user.** `github_installations.github_installation_id` is globally unique, so a second Replo account cannot link an installation that is still active for the first (D-029).
- **GitHub setup redirects to the API host.** Set the App's Setup URL to `<API_PUBLIC_URL>/github/setup` so the session cookie (same host as the API) is sent.

- **Quiz questions** are multiple choice (3–5 options) or true/false (exactly two options with keys `true` and `false`), and the content schema enforces both (`Question.superRefine`). A question whose `correct` key names no option fails validation before it reaches a learner.
- **`lesson_index.position`** is a global index across chapters, so a lesson list sorted by position is the reading order (fixed after the B8 review).
- **Mermaid nodes** map to repository paths. A file-level flow check uses `file_edges`, which hold import edges only (D-039), so a call that goes through a re-export can be reported as an unverified hop.
- **`repositories.describeLinked` and `linkedIds`** only see links that are not revoked. Use them to filter any read that crosses from generation or tutorials into the user's library.
- **Offset cursors** are decimal strings bounded to nine digits in the contracts. Do not widen the bound without checking the offset arithmetic.
- **oRPC wire format:** request and response bodies are `{ "json": …, "meta"?: … }`. Test doubles must wrap payloads in `json`. Errors are `{ defined, code, status, message, data }` with an HTTP status of 400 or more.
- **`next start` does not run the product app.** `output: 'standalone'` makes it refuse to start. The product `start` script (`scripts/start.ts`) copies the static assets into `.next/standalone` and runs the standalone server, so use `pnpm --filter @replo/product start` after a build.
- **Nonce CSP needs dynamic pages** (D-068). A new product page cannot assume build-time prerendering.

- **Playwright does not expose `Last-Event-ID` on an EventSource retry.** The route handler sees no header on reconnect, so the browser test proves convergence by replaying an applied event (the reducer drops it by id). The header is covered by the API tests.
- **Base UI and `Button` links:** a `Button` rendered as a link loses its link role (D-069). Use `LinkButton` (product) or `buttonVariants` on an anchor (landing).
- **Browser tests and credentialed CORS.** A credentialed request rejects `Access-Control-Allow-Headers: *`. The e2e mock API therefore echoes `access-control-request-headers`, as the real API does. Lighthouse runs outside the test harness and exposed this gap.
- **Stale `.next` types:** after renaming a route folder, delete `apps/product/.next`; the generated `.next/types` still reference the old path and fail typecheck.

## Verification status of the scaffold (18 Oct 2026)

Verified here: `pnpm install` (frozen lockfile OK), `typecheck`, `lint` (boundary rules proven to fail on forbidden imports), `test` (contracts 5, ai 6, repo-analysis 28, evals 1, api 36), `build` (api via tsdown; landing static export; product standalone), `drizzle-kit generate` + `check`, built API smoke test without a DB (`/healthz` 200, `/readyz` 503, unauth RPC 401, bad Origin 403, webhook without secret 503), landing page visually in light/dark/mobile.
**Not verified (no Docker/Postgres in the scaffolding environment):** migrations applying to a live DB, `me.get`, SSE replay, claim/heartbeat/reaper SQL, webhook dedupe insert, Better Auth GitHub sign-in (needs a GitHub App), the worker booting against pg-boss, product app against a running API.

## Open items

- [ ] Real worker-kill run: start the worker, kill it mid-stage, restart, and check the job resumes from its checkpoint (B9, M1 acceptance). The worker entrypoint has no seam for a scripted model, and a user-facing setting is ruled out (D-020). Add a test-only resolver in the worker's composition, not in config.
- [ ] Repo-level injection fixture in `tools/evals` (B7 accept). The steered-model test in `pipeline.integration.test.ts` covers the validator side.
- [ ] Shared rate-limit store before a second API instance (D-058).
- [ ] Decide the GitHub private-repo mechanism (D-088). Then write ADR-010 or amend ADR-005.
- [ ] Email verification and password reset (ADR-009). Needs a mail provider. Until then `emailVerified` stays false for password accounts (D-087).
- [ ] Live Google and GitHub sign-in and the Settings link flow in a browser (needs OAuth credentials; not run here).
- [ ] Accounts with only Google or GitHub cannot add a password, and a provider cannot be disconnected. Neither is built.
- [ ] Choose the domain name and set `NEXT_PUBLIC_SITE_URL` and the cookie domain (O1).
- [ ] Create the dev GitHub App (read-only Contents and Metadata; webhooks `installation`, `installation_repositories`, `repository`, `push`). Setup URL `<API_PUBLIC_URL>/github/setup`, webhook URL `<API_PUBLIC_URL>/webhooks/github`, user authorisation during install enabled (D-029 needs the user token).
- [ ] Live outline on a real user key (B4 accept). Needs an OpenRouter key; the call path is tested with the SDK mock only.
- [ ] Decide the read credential for public-repo preflight. Unauthenticated GitHub reads get 60 requests per hour per IP, which a B2 import queue will exhaust.
- [ ] Decide the CSP policy for inline `style` attributes (D-084).
- [ ] Confirm the budget reading in D-082 (no enqueue-time reservation).
- [ ] Confirm the legal drafts on the landing policy pages (privacy, terms, licence, takedown) before launch: contact channel, legal entity, licence wording for tutorial text.
- [ ] Reconcile PRD NFR-SEC-6 with D-050. The PRD says prompts and completions are "not stored", but D-050 keeps stage outputs (model completions) until publish or retention. The privacy page follows D-050. Decide which text is the rule and update the other.
- [ ] Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` in the Cloudflare build; otherwise the landing CTA and sitemap point at localhost (the default baked into the build).
- [ ] Decide whether the theme needs a "system" option in the contract (today: light or dark only).
- [ ] Decide logo and brand assets (DESIGN.md §10).
- [ ] Branch protection on `main` in GitHub settings. The repository is under git (`origin` is `github.com/dawoodxp97/REPLO_AI`, branch `main`).
- [ ] First live run: `pnpm infra:up && pnpm db:migrate && pnpm dev`, then fix whatever the DB-dependent paths surface beyond the local Postgres 18 suite.
- [ ] Run every F-phase Playwright step against staging, and capture the recorded responses from it (D-073, D-074).
- [ ] Replace the hand-written product fixtures with captures from staging (D-073).
- [ ] Real public golden repos with person-written truth sheets (B5). The ten synthetic repos and their sheets exist (D-046).
- [ ] Sentry (free tier) with a redaction check on events, and Trusted Types (SECURITY.md #11).
- [ ] Production deployment: VPS Compose, Caddy, worker container hardening, nightly encrypted backups to R2, alerts (O1). Not started; needs the VPS, the domain and the secrets.

## Changelog

- **2026-10-26** — Own auth replaces Better Auth (ADR-009; D-086 to D-089). Email and password (scrypt), Google and GitHub sign-in with PKCE and state, opaque hashed sessions, provider linking from Settings, GitHub tokens sealed with the key vault. Contracts: `auth.*` and `me.get.signInMethods`. Migration `0009` replaces the Better Auth tables and keeps GitHub links. Verified: API typecheck and lint; 48 API test files, 339 tests, with the DB suites against Postgres 17; a migration upgrade from `0008` with a seeded GitHub account; the built API over HTTP (sign-up sets the cookie, `me.get`, wrong password and duplicate refusals, revoke other sessions from a second browser, sign-out, the OAuth state refusal and the origin guard); contracts 23 tests; product typecheck, lint and 72 unit tests; Playwright 96 of 100 passing on desktop and phone. Not verified: live GitHub and Google round trips (no OAuth apps here), the Settings link flow in a browser, the four dark-theme accessibility failures on the library, import and API key pages (colour contrast on the app-shell nav links and a primary button; not run on the base commit), secure cookies over HTTPS, staging.

- **2026-10-25** — Repository under git. The local tree was added on top of the remote's initial commit (MIT `LICENSE` and a stub README), so the push is a fast-forward. Repository-local git identity only. README rewritten with install, configuration, development, build, production-run, test and troubleshooting steps. The run and build steps were checked here: `pnpm install`, `pnpm db:migrate`, `pnpm dev` (API, worker, product and landing answered), `pnpm build`, and the four `start` entry points against a local Postgres 18.4. Docker commands in the README were not run.
- **2026-10-25** — Roadmap verification and the remaining local work. Local Postgres 18.4 (embedded-postgres in a scratch folder outside the repo; databases `replo_test` and `replo_test2`). Migrations apply to a fresh database and `drizzle-kit check` passes. Backend: SSE tests for the job stream (replay after `Last-Event-ID`, owner-only 404, close at a terminal status, CORS) and for the new notification stream (session, pushes on change, no duplicate pushes, five streams per user); `GET /notifications/stream` (D-081); the 90-day notification purge in retention; a cross-user sweep over every procedure (`router.cross-user.integration.test.ts`); a steered-model publication test. Catalogue: OpenRouter slugs and prices verified (D-083), and the budget, balanced and quality presets now resolve on OpenRouter. Frontend: the bell subscribes to the stream; `main` landmarks on the lesson and source explorer; two new e2e tests (100 Playwright tests in total). The e2e mock now echoes requested CORS headers. CI actions pinned to commit SHAs. Landing L1 built by a subagent and reviewed here (copy claims, privacy hosting bullet, lint, build). Verified: `pnpm verify` with `TEST_DATABASE_URL` set (27 tasks), API 288 DB tests, product 72 unit tests, AI 30, contracts 19, repo-analysis 95, evals 27, product e2e 100, Lighthouse on the lesson and overview (accessibility 1.00; best practices 0.92 from D-084), landing `/keys/` accessibility 1.00 (spot check). Not verified: live GitHub App, real provider keys, staging, Docker images, the VPS, a real worker kill, and the landing on Cloudflare.
- **2026-10-25** — Repository tree (D-080). `tutorials.sourceTree` (contract, router, library service, pure mapper `modules/tutorials/source-tree.ts`) lists every recorded file with a readable flag, under `getSource`'s visibility rule. The source explorer shows the tree and marks cited files. Verified: contracts (19 tests), API unit (5) and the API database suite against Postgres 18 (275 tests, including two new integration tests); product unit (72) and typecheck, lint and build; 98 Playwright tests on desktop and phone. Not verified: staging.
- **2026-10-25** — Frontend F2–F7 (`apps/product`; D-074…D-079). F2: the progress feed reducer (dedupe by event id), cancel and retry, and the notification bell. F3: the stable `/tutorials` routes, a server-rendered overview (public pages read without JavaScript), the lesson player with resizable panels, sheets below 768 px, keyboard shortcuts and a command palette, the cited-source panel, lazy Mermaid and Shiki, and the Markdown renderer with its link policy. F4: the quiz, resume, progress and history. F5: library, home, search, settings (profile, preferences, GitHub, keys, models), sharing and removal with named confirmations. F6: OG images for public tutorials, metadata gating, and the operator screen behind a server check. F7: axe in both themes, reduced motion, keyboard shortcuts, and a first-load bundle check. Verified: typecheck, lint and unit tests (product 68 Vitest, contracts 15); the product production build; the landing build; 98 Playwright tests on desktop and phone against the standalone production server with the mock API. Not verified: staging, the live API, GitHub, real provider keys, Lighthouse, and the full source tree (needs a backend procedure).
- **2026-10-23** — Frontend F0 and F1 (`apps/product`, `packages/ui`; D-068…D-073). F0: nonce CSP from `src/proxy.ts` with dynamic rendering, oRPC client with per-attempt Idempotency-Keys (D-066), typed public env, the auth gate, UI primitives (Input, Select, Label, FormField, Alert, Skeleton, Dialog), the no-comments lint in both packages, Vitest and Playwright. F1: the import flow (public URL and GitHub App repositories, pre-flight, key picker, presets, audience, budget ceiling and estimate), key manager under Settings → API keys, and My repositories. `Button` no longer takes `render`; landing's three link buttons moved to `buttonVariants`. Contracts: `BudgetBelowEstimate` is exported. Verified: typecheck, lint and tests for product (32 Vitest), ui, landing and contracts (15); product and landing production builds; 20 Playwright tests on desktop and phone against the dev server with recorded responses. Not verified: staging and the live API, GitHub sign-in and the GitHub App, real provider keys, the CSP header on the standalone server, Lighthouse and keyboard checks, the dark-mode visual review, and the Markdown and lazy-loading items (moved to F3).
- **2026-10-23** — One outcome type. The service results that said `{ kind: 'ok' | 'refused' }` in eight different shapes now use `Outcome<T, R>` (`platform/outcome.ts`); success is `.value`, refusal is `.refusal`. No API or schema change. Verified: lint, typecheck, build and the non-database tests. Not verified: the database suites, whose assertions were updated to the new shape but not run (no Postgres here).
- **2026-10-22** — Query counts. `tutorials.list` reads progress in one batch (`completionRatios`: three queries per page instead of about six per row), and the session is looked up once per request. No API or schema change. Verified: lint, typecheck, build, the non-database tests, and new unit tests for the session cache. Not verified: the batched progress query against a real database (an assertion was added to the learning integration test; no Postgres here).
- **2026-10-22** — Split the three large services and removed the circular wiring (D-065, `docs/CODE_REVIEW.md`). No API or schema change. Verified: lint, typecheck, build, and the non-database tests (API 162 run and 92 skipped, AI 29, contracts 15, repo-analysis 94, evals 27); a scan of the API source finds no import cycles. Not verified: the database suites, which were rewired to the new factories but not run (no Postgres here).
- **2026-10-23** — Line-by-line review of all backend source (`docs/CODE_REVIEW.md`, sixth pass; D-066, D-067). Shared contract names added (`Pipeline`, `Theme`, `NotificationKind`, `CONTENT_SCHEMA_VERSION`, the import error `IDEMPOTENCY_KEY_REQUIRED`). Verified bugs fixed across modules: a settle failure double-released the budget reservation, workspace manifests never reached the analyzer, a retry overwrote a pending cancel, a failed stall send stranded jobs, the server minted Idempotency-Keys, grounding skipped captions, titles and code spans, and more. Behaviour changes: import requires the key; HTML now reaches grounding; the bytes limit counts all text. Verified: typecheck and lint for backend and both frontends, the non-database tests (API 176 run and 92 skipped, AI 30, contracts 15, repo-analysis 95, evals 27), and the API bundle build. Not verified: the 92 database suites (no Postgres here), so every SQL change in this pass is untested against Postgres.
- **2026-10-22** — Fake and dead values removed, columns typed (review follow-up, `docs/CODE_REVIEW.md`). Contracts: `GenerationJobDto` drops the zeroed `estimate` for real `budgetUsd` and `spentUsd`, `error` is `{ code }`, `stage` is the `Stage` enum; `PreflightResult` drops the empty `estimates`; the operator job row gains `errorMessage` and loses the always-null stage `startedAt`. Config no longer parses or requires the unused S3, backup, Sentry and alert variables. Migration `0008` drops six unused columns. DB text and jsonb columns carry `$type<…>()`, and the `pgEnum` lists come from contracts. Verified: lint, typecheck, build, the drizzle drift check and the non-database tests (API 162 run and 92 skipped, AI 29, contracts 15, repo-analysis 94, evals 27). Not verified: migration `0008` and the retyped repos against a real database (no Postgres here).
- **2026-10-22** — Backend code review (`docs/CODE_REVIEW.md`). Removed all code comments (D-064) and dead code, merged duplicated logic (repositories router error mapping, contract page and error schemas, job status lists, draft schemas, planning stage, snapshot types, chunked inserts), tightened a few types, made `readOptional` async. No API wire change and no migration. Verified: lint, typecheck, build, and the non-database tests (API 162 run and 92 skipped, AI 29, contracts 15, repo-analysis 94, evals 27). Not verified: the database suites (no Postgres here), so `generation.repo`, `indexing.repo` and `readOptional` changes are typechecked only. Open follow-ups are listed in the review.
- **2026-10-22** — Backend B6–B9 implemented (D-050…D-063). Pipeline: lite and full stages with checkpoints in `job_stage_outputs`, versioned prompts and hashes stored on every version, grounding and one repair per lesson, a judge for the full pipeline, a structural diagram from the graph, and publish into `tutorials`, `tutorial_versions`, `tutorial_source_refs` and `lesson_index`. Migrations `0004`–`0007` (pipeline tables, lesson index, preferences, reports, operators, push events, nullable tutorial owner, trigram indexes, learning `updated_at`). Library and sharing: list, overview, chapter, source, visibility with the licence gate, share link, delete, report, repository removal, account deletion with the public-tutorial choice. Learning: progress, history, mark and unmark, quiz, resume, completion ratio. Dashboard, search, notifications, settings, operator read endpoints, and the push webhook. Hardening: request IDs, origin guard, rate limits, retention purge. Verified: lint, typecheck and 254 API tests against embedded Postgres 18 (including the pipeline end to end with a scripted model, budget refusal, resume after a failed chapter, and the library's cross-user rules); contracts 15, AI 29, repo-analysis 94, evals 27. Not verified: live GitHub App deliveries, real provider keys, a real repository through the worker, the SSE unread count, a worker kill mid-stage (resume is tested with a thrown error), and Postgres 17 specifically.
- **2026-10-22** — B5 eval harness. `tools/evals` now has ten golden repos (six existing fixtures plus `redux-spa`, `monorepo`, `cli`, `legacy-js`) with truth sheets; a runner that scores the index mechanically against a committed baseline; a model probe that scores structured answers against the file list; an allow-list gate (dry run); and a `smoke` command that CI runs (about 1 s here). The analyzer gained HTML script entries, workspace package resolution and per-package entry points, and stopped mistaking destructured declarations for symbols. Verified: lint, typecheck and 27 eval tests; the smoke gates the recorded good model in and the recorded weak model out; repo-analysis has 94 tests including four new golden repos. Not verified: any real model, real public repos. Nightly evals were dropped by decision (D-048).
- **2026-10-22** — B4 BYOK keys and model picker (live outline deferred to B6, D-045). New: `packages/ai` catalogue loader and presets (`planFor`), run estimate (`estimateRun`), key checker with fixed endpoints (`createKeyChecker`), and the bundled `model-catalog.json` (OpenRouter unverified, D-041). API: keys module (list, add with check, validate, delete with `KEY_REMOVED`), models module (catalogue, preferences), `repositories.estimate`, import with key re-check and budget refusal, `KeyVault` wired from `KEY_ENCRYPTION_KEY`, usage ledger into `llm_calls`, heartbeat `stopped` handling in the worker. Removed `MODEL_CATALOG_PATH`. Migration `0003`. Verified: lint, typecheck, build, drift check; 29 AI-package tests including the live call path with the SDK mock (fallback only on retryable errors, budget refusal before any call); 128 API tests with Postgres 17, including key deletion with running and queued jobs, cross-user NOT_FOUND on validate and delete, stored keys never returned in plaintext, the ledger, preferences and estimate refusals. Not verified: a live provider key, the packaged JSON catalogue at runtime, OpenRouter slugs and prices.
- **2026-10-22** — B3 repository analysis (code complete on six fixtures). `packages/repo-analysis` gains the tree-sitter parser, symbol extraction with stable keys, module resolution (relative, `.js` specifiers, tsconfig `paths` and `baseUrl`), Next.js, React Router, Express and Fastify adapters, entry points, fan-in, fan-out and PageRank. The worker's `index` stage persists symbols and file edges, and stores entry points, routes and metrics on the snapshot (migration `0002`, additive). Verified: lint, typecheck, build and the drift check; 85 analysis tests (golden assertions, reviewed snapshots, resolution, JSONC, extraction); 118 API tests with DB, including the index stage end to end and rebuilding a missing snapshot directory; 5,000-file synthetic benchmark at about 9 s. Not verified: a real repository end to end through GitHub, the packaged image's access to grammar WASM, and the ten golden repos (B5).
- **2026-10-22** — B2 backend (partial, M1 not reached). Import, ingestion, notifications and cancel/retry work against Postgres 17 and pg-boss. New: `repositories.import` (`Idempotency-Key`, one transaction with enqueue), `jobs.retry` contract, `notifications` table (migration `0001`, additive), keys ownership lookup, `indexing` (streamed tarball, path-safe extraction, filters, caps, `snapshot_files`), pg-boss transaction adapter, `tar-stream` dependency (D-033). Worker and HTTP both declare queues. `vitest` runs files serially because DB suites truncate shared tables. Verified: lint, typecheck, build, drizzle drift; 117 API tests with DB (archive fixtures: zip-slip, symlink, hardlink, device, byte cap, ratio bomb, download cap, LFS, binary, oversized, duplicates); end-to-end import → enqueue → worker ingest → honest failure at `index`, notification, retry and cancel; both processes boot and answer. Not verified: a live GitHub tarball download, the SSE stream against a real session, a worker kill mid-job, the < 5 s import target. Not built: the recorded-fixture outline (D-035).
- **2026-10-22** — B1 backend code. Contracts: `me.deleteAccount`, `repositories.list`; `repositories.preflight` drops `supported` and `refusalReason` (refusals are typed errors) and `REPO_TOO_LARGE` data becomes `{metric, value, limit}`. No consumers existed yet. New: GitHub App client (App JWT, installation tokens, paginated REST, injected `fetch`), `GET /github/setup`, webhook handlers for `installation`, `installation_repositories` and `repository` (dedupe and change in one transaction), identity service (account deletion, GitHub user token), repositories preflight and library list, and `repo-analysis` inventory and framework detection. Schema unchanged, so no migration. CI now sets `TEST_DATABASE_URL`. Verified: typecheck and lint across the monorepo; 73 unit tests; 12 DB tests run against Postgres 17 (migrations apply, links isolated per user, cursor pagination, webhook replay and invalid payloads, uninstall revokes links, account deletion cascades, GitHub link and listing with a faked GitHub API); `drizzle-kit check`; the built API answers the new routes correctly without a session. Postgres 17 came from the `embedded-postgres` npm binaries in a scratch folder, not in the repo. Not verified: a live GitHub App (install redirect, real webhook deliveries), Better Auth sign-in and `revoke-other-sessions` with a real session, public-repo preflight against github.com.
- **2026-10-22** — BYOK-only pivot (ADR-007, D-014/D-015). PRD v0.2. Run sources, free pool, credits, top-ups, ads and billing removed from PRD, RULES, ROADMAP, contracts, schema (migration `0000` regenerated), API config, UI and landing. Verified: typecheck, lint and tests across the monorepo. Not verified: migration applied to Postgres, product and landing production builds, Playwright journey.
- **2026-10-22** — Legacy parity approved (`docs/LEGACY_PARITY.md`, D-016…D-027). PRD v0.3: added FR-AUTH-4, FR-LRN-12, FR-SHR-5, FR-GEN-11, §4.9 (FR-LIB-1–3, FR-DASH-1, FR-SRCH-1, FR-NTF-1, FR-SET-1), NFR-SEC-7, NFR-OBS-2; changed FR-LRN-5 and FR-LRN-8; resolved §13 email and language questions; non-goals now name generated examples. ADR-008 written. `docs/API.md` and `docs/DATABASE.md` updated. ROADMAP P9 "house ads" removed and new items slotted into P1, P2, P5, P7 and P8. Verified: docs only, no code changed. Not verified: nothing run.
- **2026-10-22** — ROADMAP rewritten as four sequenced tracks (D-028): backend B0–B9, frontend F0–F7, landing L1, deploy and maintain O1–O3. Requirement coverage table added; all 79 in-scope PRD IDs are assigned. PRD §11 updated. Docs only; nothing run.
- **2026-10-18** — Blueprint read; PRD, RULES, DESIGN, TECH_STACK, ARCHITECTURE, SECURITY, ROADMAP, MEM written; monorepo scaffolded and verified as above (see D-001…D-013).
