# MEM.md — Project memory

Living log of **decisions, assumptions, gotchas and open items**. Keep it current: mark a superseded decision or remove an obsolete entry. AI agents: read this before starting, add to it when you learn something non-obvious.

Entry format: `ID · date · status` → what · why · how to apply.

## Product snapshot

- **Name:** Replo. Package scope `@replo/*`. Folder: `Replo AI/`.
- **One line:** graph-first understanding for any GitHub repo — knowledge graph, interactive diagrams and a sequenced course; free for individuals, BYOK only. No sharing, pricing, billing, credits or ads (ADR-007).
- **Source docs:** `PRD.md` (build contract), `ARCHITECTURE.md`, `ROADMAP.md`.
- **Current phase:** Release 1 in build. R0 is done; R1–R9 in `ROADMAP.md`.

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

### D-009 · 2026-10-18 · ports superseded by D-102 — API/worker ports and process split

HTTP on `7200`, worker health on `7201`, landing `7100`, product `7101` (originally 4000/4001/3000/3001; see D-102). `pnpm dev` runs `dev` and `dev:worker` for all packages via Turborepo.

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

The legacy app (`OLD_LEGACY_REPLO/replo-hq-main`) was read for features, pages and flows only. No legacy shortcut was carried across: billing, credits, platform-funded generations, subscription statuses, the mock newsletter, the demo input page and invented testimonials are not part of the product. **How to apply:** a new feature traces to a requirement ID in the PRD or to a decision here.

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

Owners can change visibility, delete a **course**, and remove a repo from the library. They cannot edit modules, lessons, quizzes or titles (non-goal, PRD §2). **Why:** hand-written prose bypasses grounding. A manual claim would have to be labelled `interpretation`, which undercuts the core promise. **How to apply:** no editor screens or authoring procedures in R1.

### D-027 · 2026-10-22 · active — No ads in the roadmap

ROADMAP P9 said "house ads". ADR-007 and RULES §0.7 forbid ads, so the phrase was removed. **How to apply:** any ad wording in docs or copy is a bug to fix.

### D-028 · 2026-10-22 · active — Delivery is sequenced: backend, frontend, landing, then deploy and maintain

ROADMAP runs one sequence, contract first: R0 spec → R1 contracts and data → R2 API → R3 pipeline → R4 product → R5 admin → R6 landing → R7 evals → R8 cleanup → R9 deploy. **Why:** the contract is the highest-traffic seam (contract-first, ARCHITECTURE §1), and building UI against it before it stabilises causes rework. **How to apply:** a phase is done when its rows in `docs/API.md` are implemented with contract and cross-user tests; the next phase starts only after that gate.

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

### D-046 · 2026-11-18 · active — The golden set is thirteen synthetic repos until real ones are reviewed

R7 asks for golden repos across sizes and shapes. The set is the ten fixtures from R3 plus `commerce-platform`, `legacy-monorepo` and `prompt-injection`, covering the blueprint's shapes and the small/medium/large mix: `commerce-platform` is a medium mixed TS/JS/SQL/CSS repository and `legacy-monorepo` is a large JS/TS monorepo. Each has a `truth.json` in `tools/evals/golden/`. Their index expectations were checked against the source by hand, and the analyzer then matched them, so the index baseline guards against regressions and does not measure accuracy on real code. Real public repos (pinned SHA, person-written sheets) are the next step and must not be committed with private code. **How to apply:** do not quote index accuracy as a result until real repos are scored.

### D-047 · 2026-11-18 · active — Model probes and recorded courses share one gate, and the thresholds are provisional

A probe shows a model the file list and scripts of a golden repo (never the truth sheet) and asks for entry points and routes. Each answer is scored for schema validity, reference validity before validation (share of returned paths that exist), fabricated paths, entry recall, route recall, latency and cost. A course artefact is the published `CourseContent` plus job telemetry; `scoreCourse` measures graph coverage and integrity, citation validity (100%), diagram validity (100%), claim support (≥ 0.95), course coherence (≥ 0.8), quiz quality (≥ 0.9), injection resistance (100%) and the per-size latency/token budget. The gate (`tools/evals/src/gate.ts`) requires both a passing probe and passing course artefacts on every golden repo. These numbers are provisional and must be set from the first real runs. **Why:** "the model points, the system quotes" (RULES §0.5): what a model returns is checkable against the index, and the published document is what ships. **How to apply:** change `GATE` only with a MEM entry and a before/after run.

### D-048 · 2026-10-22 · active — No nightly eval and no live model keys in CI

The team decided that a nightly eval run is not required. CI runs `pnpm --filter @replo/evals smoke` on every change: the index is checked against the committed baseline, and the recorded probe and course artefacts go through the allow-list gate. The run fails when the recorded good model misses a threshold or the recorded weak model passes. No provider key is stored in CI, and no workflow runs on a schedule. **Why:** a nightly run that calls live models would need an operator key in CI secrets, which conflicts with ADR-007's rule that the platform holds no provider keys. **How to apply:** a model's place on the free allow-list changes only by a person running the gate with real answers and recording the result here. Do not add a scheduled eval or a CI secret for a provider without a new decision in this file.

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

`link` visibility requires the token (24 random bytes, base64url), compared with `timingSafeEqual`. `createShareLink` returns `{PRODUCT_ORIGIN}/courses/{owner}/{repo}/{slug}?share=…`. Switching to `private` clears the token. Every read goes through the same viewer rule, so a private **course** answers NOT_FOUND to everyone but its owner (FR-SHR-1, RULES §0.4).

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

### D-064 · 2026-10-22 · superseded by D-109 — No comments in code

Source files carry no comments: names, types and tests say what the code does, and the reasons live in this file and in `docs/`. Generated SQL under `apps/api/drizzle` is exempt.

### D-065 · 2026-10-22 · active — One service per role, wired in dependency order

A module exposes several small services instead of one large one (tutorials: publisher, reader, library, manager; generation: jobs, runtime, history; repositories: library, imports, changes, sources). A service depends on another through `Pick<…>` of the methods it calls. `composition.ts` builds them in dependency order with no closures over services created later; a dependency that would close a loop is cut by moving the shared method into a smaller service (for example `RepositorySources.ingestSource`).

### D-066 · 2026-10-23 · active — Import requires an `Idempotency-Key`

`repositories.import` refuses a request without the header (`IDEMPOTENCY_KEY_REQUIRED`). The handler used to mint a random key when none was sent, so a retried request started a second run and spent the user's key again. **Why:** the key is the only protection against duplicate paid jobs. **How to apply:** the client creates one key per import attempt and reuses it on retries. Resolved in F1: `createIdempotencyKeys` (`apps/product/src/lib/idempotency-key.ts`) reuses the key while the payload is unchanged, and the oRPC link adds the header only when a call supplies one.

### D-067 · 2026-10-23 · amended by D-109 — Backend comments are blocked by lint

`replo/no-comments` (`packages/config/eslint`) is part of the backend ESLint configs (`apps/api`, `packages/contracts`, `packages/ai`, `packages/repo-analysis`, `tools/evals`) and fails on any comment. D-064 is still the rule; the lint rule keeps it. Frontends and `packages/ui` are covered from D-070. **How to apply:** do not add an ESLint disable directive to get around it; record an exception here first.

### D-068 · 2026-10-23 · active — Frontend CSP is per request, set by `src/proxy.ts`

`lib/csp.ts` builds the policy: `script-src` and `style-src` take a per-request nonce with `'strict-dynamic'` for scripts, `connect-src` allows only the API origin, and `frame-ancestors` is `'none'`. The root layout awaits `connection()`, so every page renders per request and Next can apply the nonce; a statically prerendered page has no request to take a nonce from (Next's CSP guide). **Why:** NFR-SEC-4 (web). **How to apply:** development adds `'unsafe-eval'` and inline styles (React debugging and the dev overlay). `upgrade-insecure-requests` is sent only when the app URL is https, because on http it would upgrade the localhost API calls to https and break them. Trusted Types are not enabled (SECURITY.md #11).

### D-069 · 2026-10-23 · active — Links are anchors, not Base UI buttons

Base UI's `useButton` sets `role="button"` on every non-native element, so `<Button render={<Link />}>` was announced as a button, not a link. `Button` no longer accepts `render`. The product uses `LinkButton` (`src/components/link-button.tsx`, `next/link`). Landing, which may import only `@replo/ui`, uses `buttonVariants` on a plain anchor, or `Link` for hash links. **How to apply:** `Button` is for actions; anything that navigates is a link.

### D-070 · 2026-10-23 · active — Frontend code has no comments either

`replo/no-comments` runs in `apps/product` and `packages/ui`, so D-064 now covers the frontends too. CSS files carry no comments. Landing has no such rule yet: its one JSDoc was removed in the same pass, and the rule joins landing's lint. **How to apply:** explain behaviour through names, types and tests.

### D-071 · 2026-10-23 · active — The browser parses shared contract schemas at its boundaries

Frontends import runtime Zod schemas from `@replo/contracts` (`ImportRepositoryInput`, `RepositorySource`, `AddKeyInput`, `JobEventDto`) for form validation and for parsing SSE payloads, so one schema describes both sides. RULES §1 limits the product's use of contracts to types for the API client; the client itself stays type-only. **Why:** RULES §3 requires a Zod parse at every boundary. **How to apply:** a new shared shape goes into contracts, not into the app.

### D-072 · 2026-10-23 · active — F0 defers renderers that have no consumer yet

The allow-list Markdown renderer, its link policy and the lazy Mermaid, CodeMirror and Shiki loaders move to F3, where lessons first use them. Building them in F0 would leave unused code behind. **How to apply:** the link policy (repo permalinks and allow-listed domains) lands with the renderer, not before.

### D-073 · 2026-10-23 · superseded by D-074 — Browser tests run on the dev server with recorded API responses

Playwright (`apps/product/e2e`) starts `next dev` on port 3101 and answers oRPC calls through `page.route`, using responses in `e2e/fixtures/recorded.ts`. The fixtures are written to the contracts by hand; they are not captured from a live API, and the staging run in the F-phase DoD is still open. Port 3001 is held by an unrelated local process, so the e2e origin moved. **How to apply:** update the fixtures whenever a contract changes, and replace them with captures from staging before treating them as coverage of the live API.

### D-074 · 2026-10-25 · active — Browser tests run the production build against a mock API

Playwright (`apps/product/e2e`) builds the product, starts the standalone server through `scripts/start.ts` on port 7110 (was 3101), and starts a mock API on port 7210 (was 4100) from `globalSetup`. Server-rendered pages call the API from the Next server, which browser interception cannot see, so the mock serves the same recorded responses (`e2e/fixtures/handlers.ts`). Per-test behaviour is set with `page.route` overrides. **Why:** the production build is the only place the nonce CSP runs as shipped, and the public pages must be tested as the server renders them. **How to apply:** when a contract changes, change the fixtures in the same change; a test that passes against stale fixtures proves nothing.

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

`courses.sourceTree` lists every file recorded in the pinned snapshot, sorted by path, with its size, language, role and a `readable` flag. The flag is not stored: it is `decideFile(path, size).keepContent` from the indexing file policy, the same rule that decides whether the text is kept on disk. The tree uses `getSource`'s visibility rule (owner, public, or a valid link token), and foreign **courses** return NOT_FOUND. **Why:** the explorer needs the whole tree (FR-LRN-8), and the rows already exist, so no migration or disk walk is needed. **How to apply:** the list is bounded by the ingest caps (about 5,000 files), so it is returned whole and not paged. If the file policy or its size cap changes, bump `ANALYZER_VERSION` so snapshots built under the old rule are re-indexed, or the `readable` flag will disagree with the disk.

### D-081 · 2026-10-25 · active — The unread count has its own stream, `GET /notifications/stream`

The API pushes the unread count as an `unread` SSE event on connect and whenever it changes. The check runs every 5 s per open stream, with a keep-alive comment about every 15 s. A user may hold at most five streams (`429 TOO_MANY_STREAMS`, `Retry-After: 60`), and a request without a session gets 401. The bell subscribes to it and polls every 30 s only while the stream is down. **Why:** `API.md` first said the job progress stream would carry the count, but the bell sits on every page and no job is open there, so a user-scoped stream fits. **Cost:** one `COUNT` per open stream every 5 s. Move to LISTEN/NOTIFY or a shared store before more than a few hundred concurrent users (with D-058). **How to apply:** new pushes use `platform/sse.ts`; keep the stream tests (`notifications.stream.integration.test.ts`) passing.

### D-082 · 2026-10-25 · needs confirmation — No enqueue-time budget reservation

ROADMAP B6 asked for the budget to be "reserved at enqueue". The implementation does not reserve. It refuses at import when the estimate exceeds the ceiling (D-043), checks the budget before each call, settles after it, and carries spend across retries in `generation_jobs`. **Why:** RULES §4 says the per-job budget is in-process and needs no counter table. The spend is the user's own key, so no other job competes for it, and a reservation counter would add a shared row with no shared resource to protect. **How to apply:** if the team wants a hard reservation, add an atomic `UPDATE … WHERE used + n <= limit` counter in a new decision and migration. The owner should confirm this reading before the B6 status is treated as final.

### D-083 · 2026-10-25 · active — OpenRouter slugs and prices are verified (supersedes the OpenRouter part of D-041)

`packages/ai/catalog/model-catalog.json` now holds the three OpenRouter models read from `https://openrouter.ai/api/v1/models` on 25 Oct 2026: `anthropic/claude-opus-5.5` ($4 in / $20 out per MTok), `anthropic/claude-sonnet-5.5` ($2 / $10) and `anthropic/claude-haiku-5.5` ($0.10 / $0.50). All three list structured outputs. The prices match the Anthropic direct prices in the catalogue. The `budget`, `balanced` and `quality` presets now resolve on OpenRouter. `free` still refuses, because its allow-list stays empty until a real eval-gate run passes (D-048). **How to apply:** re-read the list before launch, since prices change, and update `priceSource` with the date.

### D-084 · 2026-10-25 · open — The strict CSP blocks inline `style` attributes from three sources

Production headers use `style-src 'self' 'nonce-…'`, so a `style` attribute cannot be applied. On the lesson player these come from Next's route announcer, the resizable panel library and Mermaid's SVG output. The browser logs a CSP violation for each one. The layout still renders on desktop, and Lighthouse's best-practices score is 0.92 because of it. **Options:** (a) keep the policy and patch or replace the sources, or (b) add `style-src-attr 'unsafe-inline'`. A style attribute cannot run script, so (b) is a defensible weakening, but NFR-SEC-4 says strict CSP. The owner must choose; until then the policy stays as it is.

### D-085 · 2026-10-25 · active — Landing content is TSX; policy pages are drafts until reviewed

`apps/landing` uses TSX content pages, not MDX, so no dependency is added (D-008 was written for MDX once there is content, and the team can revisit it). The key guide lives at `/keys/`, next to the "Your key" label. Policy pages (privacy, terms, licence) each carry "Draft. Reviewed before launch." and name no operator, address or contact address. The contact channel is decided before launch. The landing's no-comments lint rule is on (`replo/no-comments`, closing the D-070 follow-up). `serve` is pinned to 14.2.6 in the start script. `public/_headers` keeps `script-src 'unsafe-inline'`, because Next's static output needs inline bootstrap scripts and Cloudflare `_headers` cannot carry build-time hashes. **How to apply:** before launch, the founder must decide the operator details and counsel must review the privacy, terms and licence wording (open items).

### D-086 · 2026-10-26 · active — Own auth replaces Better Auth (ADR-009)

Sign-in is GitHub, Google, or email and password, all in `modules/identity`. A session is an opaque token in the `replo_session` cookie, and only its hash is stored in `session`. Each provider link is one `auth_identity` row per user and provider. **Why:** Better Auth's schema and cookie contract were not ours to shape, and the product needs a sealed GitHub token and its own linking rules. **How to apply:** do not reintroduce Better Auth. Read the session through `sessionFromRequest` (one lookup per request). Write identities only through `auth.service.ts`. Procedures take the user from the session, never from input.

### D-087 · 2026-10-26 · active — A provider login merges only into a verified account

`signInWithProvider` links to an existing account only when the provider verified the email and the account's own email is verified. A password account is never verified (there is no mail yet), so a Google or GitHub login with the same email gets `ACCOUNT_EXISTS`, and the user is told to sign in with the password and connect the provider in Settings. A link from Settings (`intent=link`) marks the account's email verified when the provider's verified email matches. **Why:** otherwise someone who signs up with a victim's email and a password could later be merged with the victim's real provider login. **How to apply:** keep `emailVerified` true only where a provider or a verification flow proved it. When email verification lands, set it there and revisit `ACCOUNT_EXISTS`.

### D-088 · 2026-10-26 · open — Private-repo access from GitHub sign-in needs an ADR-005 decision

The request is that a user who signs in with GitHub can import private repositories, and everyone else sees public repositories only (FR-AUTH-5). Today private repositories come only from a GitHub App install (D-029), and linking an install needs a GitHub login token. A login alone grants private access only through an OAuth App token with the `repo` scope. ADR-005 accepted a read-only GitHub App and rejects an OAuth App for private source. The options: (A) switch the GitHub login to an OAuth App with `repo`, which grants private access on sign-in, supersedes ADR-005, and gives a write-capable token that the code would only read with; (B) keep the App, so GitHub login stays a prerequisite and the install grants access; (C) request the install during sign-in with the App's user token. **Why open:** it changes the security posture for the most sensitive asset. **How to apply:** nothing changes until the owner picks an option. Then write ADR-010 or amend ADR-005, and update D-029 and FR-AUTH-5. The profile copy "Connect GitHub to import private repositories" holds under every option, because a GitHub connection is needed in each one.

### D-089 · 2026-10-26 · active — Migration 0009 replaces the Better Auth tables and keeps GitHub links

`0009_custom_auth` creates `auth_identity`, copies each `account` row with provider `github` into it without its token (Better Auth sealed tokens with its own secret, so they cannot be reused), then drops `account`, `verification` and the old `session`, and creates the new `session`. Nothing is deployed yet (O1 is open), so no production sessions or accounts exist. **How to apply:** a user with a carried-over GitHub link sees `github_not_linked` until they sign in with GitHub once more. For a future table replacement, `drizzle-kit generate` asks rename questions that need a TTY: write the SQL by hand, and generate the snapshot with `generateDrizzleJson` from `drizzle-kit/api`.

### D-090 · 2026-10-30 · active — Any GitHub repo with readable text, not TypeScript/JavaScript only

Preflight refuses a repository only when it has zero indexable text files (empty or binary-only), not when it lacks `.ts` or `.js` sources. `SnapshotStats` adds `indexableFileCount`. TypeScript and JavaScript keep tree-sitter symbol analysis; other languages are stored and quoted by path and line, with symbol checks skipped where no grammar exists. **Why:** the product promise is any GitHub repository. **How to apply:** do not reintroduce a language allow-list at preflight; add grammars in a separate change with an eval run.

### D-091 · 2026-11-01 · active — UI kit: shadcn-style on Base UI, native form controls, semantic-only colour

`packages/ui` now carries the full kit (DESIGN.md §6). Checkbox, radio, switch, select and progress are native elements styled with Tailwind, because Base UI's hidden inputs carry inline `style` attributes that the nonce CSP blocks on SSR pages (D-068) and public pages must work without JavaScript. Overlays (dialog, alert dialog, sheet, menu, popover, tooltip, tabs) use Base UI and render client-side. Tokens are defined once with `light-dark()`; `data-theme` pins light or dark, otherwise the OS decides, and the `dark:` variant matches both. The interface is monochrome; green, amber, red and blue appear only for observed, interpretation, failure and links/focus. **How to apply:** compose screens from `@replo/ui` and `apps/product/src/components` (QueryBoundary, LoadMore + `lib/paging`, ConfirmDialog, PageHeader); never hand-roll those states; check DESIGN.md §1 "Not this" before shipping a screen.

### D-092 · 2026-11-01 · active — Theme preference is System, Light or Dark (default System)

`Preferences.theme` is `system | light | dark`; migration `0010` changes only the column default, so existing rows keep their stored value. The product applies it through `features/session/use-theme-preference.ts` (System removes `data-theme`). The account menu in the sidebar and Settings → Preferences both set it.

### D-093 · 2026-11-01 · active — GitHub access is checked against the user, not just the installation

An installation token can read every repository in an org installation, so listing (`/user/installations/{id}/repositories` with the user-to-server token), pre-flight and ingest all require `GithubService.userCanAccess(userId, repo)`; without a stored GitHub token they fail closed. A 401 from the user token surfaces as `GITHUB_RELINK_REQUIRED`. **Why:** RULES §0 rule 4 (private reads are user-scoped). **How to apply:** any new path that reads a repo through an installation must ask `userCanAccess` first; test stubs of `IndexingDeps` must provide `ingestSource` and `userCanAccess`.

### D-094 · 2026-11-01 · active — Terminal job events come from the store transaction; validate is checkpointed per unit

`JobStore.finish` emits the terminal event (succeeded, failed with code, canceled) and records the notification in the same transaction as the status change, and only when the row actually changed. `markWaitingRetry` moves only running or stalled jobs; a canceling job is finished as canceled. Raw provider text is never stored in `error_detail`. The validate stage checkpoints each paid unit in `job_stage_outputs` (`lesson:<key>`, `overview`, `judge:<chapterKey>`, then `all`), so a retry never repeats a repair or judge call.

### D-095 · 2026-11-02 · active — Job and search results carry the tutorial's link, not just its id

`GenerationJobDto.tutorial` and every `search.own` lesson hit carry `{ owner, repo, slug }` (the shared `TutorialRef` contract), so the job page and search link straight to the tutorial or lesson. The job's ref comes from `TutorialReader.refOf(viewer, tutorialId)`, which returns `undefined` for a missing or unreadable tutorial, and the DTO then says `null`; the product falls back to the library. **Why:** the job page used to scan the first 100 library rows for the id (B40), and lesson hits were dead text unless their tutorial also matched the query (B54). **How to apply:** a DTO that the product turns into a tutorial URL carries a `TutorialRef`, never just an id for the client to resolve; `JobServiceDeps` needs `tutorials: Pick<TutorialReader, 'refOf'>` (stub it in tests that never publish).

### D-096 · 2026-11-02 · active — Refactor round: shared homes and package decisions

- **ai:** `generateStructured` takes one `ModelSpec` plus a `LanguageModel` (the Registry type and fallback loop are gone). A failed call settles usage when the thrown error carries it (schema-invalid output via `NoObjectGeneratedError.usage`) and releases the reservation otherwise; `Budget.release` and `Budget.settle` require the reserved amount. `ai` exports `RunCostEstimate` (`RunEstimate` stays the contracts DTO). `provider-table.ts` holds the per-provider key-check request and model factory: a new provider needs a `PROVIDERS` entry in `catalog.ts` plus one `PROVIDER_TABLE` row, and TypeScript flags a missing row.
- **Duplicated tuples:** contracts and ai/repo-analysis cannot link at compile time (leaf-package rule), so the provider, preset, tier, `FILE_ROLES` and `CatalogModel` tuples stay duplicated. Adding one needs edits in each package; a cross-check test in `apps/api` is the only place that could enforce it.
- **contracts:** zod 4 `.pick()`/`.omit()` throws on a schema with refinements (tutorial content `Question` has `superRefine`), so derived shapes reuse `QuestionKind` and `Evidence`. `TimeZone` lives in `common.ts` with a validated-zone cache; `Progress`, `NonNegativeInt`, `JobRef`, `JobProgressFields`, `RoleModels` are shared fragments.
- **repo-analysis:** adapters live in `analysis/adapters/` (`entry()`/`route()` factories in `scores`); `toSourcePath` is in `analysis/source-path.ts`. `extract.ts` emits every exported function, component or hook in `exportedFunctions`; `nextAdapter` filters HTTP verbs. Ordering uses a code-unit comparator, not `localeCompare` (golden snapshots unchanged).
- **api shared homes:** `platform/job-status.ts` (`IDLE`, `IN_FLIGHT`, `RETRYABLE`, `TERMINAL`, `isStatusIn`, `isTerminalStatus`, `jobLink`); `platform/sse.ts` `runPollingStream` (heartbeat, abort-aware sleep, session recheck; `sessionTokenOf` in `identity/session-request.ts`); `platform/pagination.ts` `keysetPage` (services pass `limit + 1` to repos). `requireFound`/`notFound` in `platform/errors.ts` stays the single 404 helper.
- **api structure:** `deleteAccount` moved to `modules/account/account.service.ts` (uses `identity.deleteUser(tx)` and `tutorialManager.settleOwnerDeletion`); identity no longer imports tutorials. `SessionUser` is defined in `identity/auth.types.ts` and re-exported from `context.ts`. `createDomainServices` and `createServices` require a vault; one `SessionService` is shared. `oauth-attempt.ts` and `auth-redirects.ts` split out of `auth.route.ts`. Preference defaults come from the `user_preferences` column defaults (`PREFERENCE_DEFAULTS` in `settings.repo`).
- **Not done:** the 404 access-check DRY, splitting composition into `composeApi`/`composeWorker`, a keyset cursor for `dashboard.recent`, batched retention deletes for all tables, and removing the `googleClient`/`githubClient` wrappers (`oauth.test.ts` uses their `timeoutMs`).

### D-097 · 2026-11-02 · active — API process may transiently decrypt a key to validate it

`keys.validate` and the re-validation inside `repositories.import` decrypt a user's key in memory in the HTTP process through the narrowed validate-only vault, use it for the provider check, and drop it. Nothing is logged or persisted. Pipeline use (`openForJob`) stays worker-only. RULES §0.3 and CLAUDE.md rule 3 carry the exception.

### D-098 · 2026-11-02 · active — Database, pool and GitHub client limits

- `DB_POOL_MAX` (default 10). pg-boss gets max 4 connections, so a process opens at most `DB_POOL_MAX + 4`. The `pg.Pool` has an `error` listener, `connectionTimeout` 5 s, `idleTimeout` 30 s, `statement_timeout` 30 s, `idle_in_transaction_session_timeout` 60 s. Env vars are documented in `apps/api` config only; no `.env.example` exists.
- GitHub client: 30 s request timeout (5 min for the tarball), `GithubRateLimitedError` (a `GithubApiError` for 403/429 with rate-limit headers), one retry of GETs on 502/503; `classifyGithubFailure` and `repoApiPath` live in `platform/github/client.ts`. Owner and name from public repo URLs are validated against GitHub name patterns in preflight and interpolated only through `repoApiPath`.
- Installation tokens are cached per process in `github.service` (reused until 5 min before `expires_at`, in-flight deduped). A token revoked early stays cached until it expires.
- `markLesson` keeps the completed-elsewhere guard on `in_progress` because `learning.integration.test` pins it.

### D-099 · 2026-11-02 · active — Generation, retention and SSE behaviour

- `sanitizeMarkdown` strips fenced code blocks (including unterminated ones) from all model-authored markdown, enforcing RULES 0.5.
- Job events SSE no longer queries the job row per tick: it ends when the job was terminal at connect or when the last flushed event is succeeded, failed or canceled. A retry emits `queued` in the same transaction, so a replayed old terminal event does not end a retried job's stream. `Last-Event-ID` is zod-parsed. No per-user stream cap and no idle backoff yet.
- Retention: `job_stage_outputs` for finished jobs go in one `DELETE` with a subquery; `job_events` and `llm_calls` in 5000-row batches; `repo_push_events` not newer than any snapshot of their repository are purged. `RetentionService` takes `tutorials`; `pipeline.purgeOutputs` is gone. `report.finishedJobs` counts distinct jobs whose outputs were deleted.
- `generate-tutorial` payload is `{ jobId }` only; in-flight v1 messages still parse (zod strips extra keys). `StageContext` no longer carries payload. `withTimeout` uses `AbortSignal.any/timeout`; `graceMs` is required.
- `VersionAccess` (was `TutorialReader` until D-109) has `readableHead` and `lessonsOfVersion(versionId)` (no access check: resolve a readable version first); `lessonsOf(viewer, versionId)` is removed. `readableTutorial` in `access.ts` is the single load, `canRead`, else 404 helper. `source` and `sourceTree` take `commitSha` from the snapshot.

### D-100 · 2026-11-02 · active — Frontend refactor decisions

- Generation cache: after job-terminal events it invalidates dashboard, `repositories.list`, `tutorials.list` and notifications, not `jobs.key`, estimate, preflight or tutorial content. Start-import navigates before invalidating.
- SSE streams (job events, notifications) go through `apps/product` `hooks/use-event-source.ts`: closed while the tab is hidden, reopened on visible. The job page polls only when the stream is `lost`; `jobs.get` refreshes on stage events are throttled to one per 5 s; the notifications stream refetches the unread count on every (re)open.
- The import form pre-fills audience, preset, budget and saved custom models once from Settings and never overwrites edits; `custom` appears only when saved custom models exist. One action label, "New tutorial", for every link to `/import` (`lib/import-path.ts`); `/import?repo=owner/name` pre-fills the public-URL source for public repositories only.
- The architecture diagram picks the mermaid theme from `data-theme` or `prefers-color-scheme` and re-renders on change. Dashboard Home leads with Continue reading; visibility labels are Private, Link and Public (`VISIBILITY_LABEL`). Login buttons list Google before GitHub.
- Tailwind v4 `--text-*` theme variables create `text-*` utilities, so the named sizes are theme tokens. Landing keeps copy and data in `apps/landing/src/lib/content.tsx` and `providers.tsx`; home sections are in `components/sections/*`. Landing copy: the two FAQ entries on cost and team plan are merged; the how-it-works title is "How it works" with no lede.
- Open: the source explorer still issues one `getChapter` per chapter to learn cited paths (needs a `tutorials.citedPaths` endpoint or a cited flag on `sourceTree` entries; document it in `docs/API.md` when added); the operator jobs table has only a forward "Next page"; no backoff or jitter on polling; three alerts with titles still use `Alert` directly; no `parseOption` helper, generic `useInvalidatingMutation` or shared github hook; repository search hits link to `/repositories`; no `aria-current` on landing nav links; arbitrary-size `ring-[3px]` remains on switch, checkbox, radio-group, tabs and `packages/ui/src/lib/control.ts`.

### D-101 · 2026-11-05 · active — First product improvement pass and local stack isolation

- The requested direction is a restrained developer workspace. Landing, sign-in, shell navigation, and dashboard setup now use a clearer hierarchy and actual next actions within the existing graphite/token system. The example preview remains explicitly illustrative. Continue reading stays first on Home.
- Login and profile connection actions use `auth.providers`; unavailable providers no longer produce dead OAuth links. Email remains usable if discovery fails. Auth refusals explicitly use 401 (`INVALID_CREDENTIALS`) and 409 (`EMAIL_TAKEN`), with router regression coverage.
- Notification stream events cancel an older pending unread-count query before writing the cache. A delayed HTTP response can no longer replace the newer pushed value. The browser failure was a real cache race; the SSE fixture itself was valid. Unit coverage reproduces a late response and the browser stream check passes.
- Accessibility checks now return preferences matching the requested theme; previously the dark runs could switch to a light fixture during analysis and report transient mixed-theme contrast failures.
- Docker restored a separate older Replo stack using 3000 and 5432. This checkout uses ignored local config for landing 3002 and PostgreSQL 5433. Compose accepts `POSTGRES_PORT`, defaulting to 5432. Legacy MinIO is opt-in (`storage` profile): its image could not be pulled and no current API consumer needs it. Existing containers and data were left intact.
- Live OAuth/GitHub, real model keys, worker-kill verification, and deployment remain unverified.

### D-102 · 2026-11-09 · active — Dev ports moved to the 7100/7200 range

Landing `7100`, product `7101`, API `7200`, worker health `7201`, Playwright product `7110`, mock API `7210`. **Why:** 3000/3001/4000/5000 collide with other local stacks on the dev Mac (a Python server holds 5000; an older Docker Replo stack used 3000). **How to apply:** defaults live in `apps/api/src/platform/config.ts`, `apps/product/src/lib/env.ts`, the landing `siteUrl`/`APP_URL` fallbacks, both Next `--port` flags, `apps/product/e2e/support/origins.ts` and `.claude/launch.json`; local `.env` files must match. OAuth callback URLs registered with GitHub/Google must use `http://localhost:7200/auth/<provider>/callback`. PostgreSQL stays on 5432.

### D-103 · 2026-11-09 · active — Saved theme mirrored in a cookie and applied during SSR

`applyTheme` writes `replo-theme=light|dark` (cleared for `system`; `Path=/`, one year, `SameSite=Lax`, `Secure` on https) and the root layout reads it with `cookies()` to set `data-theme` on `<html>`. **Why:** `ThemeSync` only runs in the signed-in shell, so the player, overview, explorer, progress and sign-in followed the OS instead of the saved choice, and every load flashed the OS theme before `settings.get` resolved (UI audit #2). A cookie needs no API call on public pages and no inline script, which the nonce CSP would block. **How to apply:** the preference in the database stays the source of truth; the cookie is refreshed whenever the shell loads it or the reader changes it. Parse it only through `parseThemeCookie`.

### D-104 · 2026-11-09 · active — UI/UX refactor runs in slices

UI/UX work runs in slices: foundations, player and source, workspace flows, dashboard, and guard rails. Each slice ships with its tests and a re-run of the accessibility sweep. Slice 1 (foundations) landed 2026-11-09.

### D-105 · 2026-11-09 · active — Player shows code first; diagrams and code themed for contrast

- The source column shows the lesson's first resolvable reference until the reader picks one (`firstResolvedReference`); the URL keeps `?ref` only for explicit picks, and the default applies only at ≥ 768 px so the phone sheet never opens unasked. `ShownReferenceContext` marks the matching evidence chip with `aria-current`, and `r` steps from the reference on screen.
- `/code` opens the first cited readable file in tree order, else the root README (`defaultSourcePath`), and now sits in `TutorialShell wide` (top bar and `<main>`).
- Mermaid keeps its `neutral`/`dark` base with `look: 'classic'` (Mermaid 12 defaults to `neo`, whose `[data-look="neo"].node rect` rule adds a drop shadow and gradient stroke and out-ranks plain `.node` selectors) and gets `themeCSS` from the tokens (no drop shadow, hairline outline, labels on the card colour) and the page's computed font, so labels are measured with the font they render in. `themeCSS` is compiled under the diagram's `#id`, so it wins over the theme without `!important` and stays CSP-safe through the adopted-stylesheet path.
- **Why:** UI audit #4/#9/#10: the source column opened empty, Mermaid's default shadows broke the design rules, and `github-light` fails 4.5:1 for keywords, strings and comments even on the plain code background. Shiki now uses `github-light-high-contrast` and `github-dark-default`, and `code-highlight` moved to `oklch(0.965 0.03 158)` / `oklch(0.27 0.05 158)` so every token clears 4.5:1 on the cited range too.
- **How to apply:** check new code or highlight colours against both `code-bg` and `code-highlight`; keep diagram styling in `diagram-theme.ts`, not in Mermaid `classDef`.

### D-106 · 2026-11-09 · active — Job DTO names its repository; workspace flows tidied (UI audit slice 3)

- `GenerationJobDto` gains `repository: { owner, name } | null`, `audience` and `preset` (all with defaults, so older payloads parse). `JobService.toDto` reads the name through `RepositoryLibrary.describeLinked` (user-scoped: a removed repository yields `null`) and the preset from the stored model plan via `ModelPreset.safeParse`. The job service is now built after the repository library in `composition.ts`.
- `/jobs/:id` is filed under Library (sidebar and breadcrumb); breadcrumbs render only for nested routes (`breadcrumbsFor`).
- `formatUsd(0)` is `$0.00`; four decimals are kept only for amounts strictly between zero and one cent.
- `ConfirmDialog` triggers default to the new `destructive-outline` button variant.
- **Why:** UI audit #11–#14, #17, #18: the job page never said what it was generating, `$0.0000` read as noise, jobs lit up "Repositories", two primary "New tutorial" buttons competed on every workspace page, the import button was disabled without a reason, and deletes looked like ordinary actions.
- **How to apply:** new nested routes add a case to `breadcrumbsFor`; new destructive actions go through `ConfirmDialog` without overriding the trigger variant.

### D-107 · 2026-11-09 · active — Accessibility and touch size are guarded in e2e (UI audit slices 4–5)

- `e2e/accessibility.spec.ts` covers all 16 product routes in light and dark on both Playwright projects and fails on any axe violation (WCAG 2.0/2.1 A and AA plus best practice, every impact), not just serious and critical. On the phone project it also fails on any control under 40 px (`e2e/support/touch-targets.ts`); a native radio or switch counts as covered when its wrapping `<label>` is at least 40 px tall, and only links inside `p`, `dd` or `figcaption` count as inline text.
- The mock API (`e2e/support/mock-api.ts`) holds `/notifications/stream` and `/jobs/:id/events` open as idle event streams, so mock mode no longer logs 404s or shows “Reconnecting”; teardown calls `closeAllConnections()` first.
- The `link` visibility is labelled “Shared by link” everywhere; overview badges use `AUDIENCE_LABELS` and `VISIBILITY_LABEL` instead of raw enum values.
- **How to apply:** a new route gets a row in `PAGES` in the accessibility spec; a new small control gets a `pointer-coarse:` size or a padded wrapping label (see `preference-switch.tsx`).

### D-108 · 2026-11-11 · active — One baseline migration and consistent table names

The fifteen migrations became `0000_baseline.sql`; none had reached a live database. Tables are plural and a child carries its parent's prefix: `users`, `sessions`, `auth_identities`, `repository_snapshots`, `repository_push_events`, `snapshot_symbols`, `snapshot_file_edges`, `tutorial_lessons`, `job_checkpoints`, `job_llm_calls`. `generation_jobs` keeps its name so it is not confused with pg-boss's `pgboss.job`. Columns: `provider_key_id`, `github_installation_id`, `encryption_key_version`, `reporter_user_id`, `job_events.created_at`, `quiz_attempts.answered_at`. `generation_jobs.kind` is dropped (it only ever held `generate`). `tutorials.current_version_id` now references `tutorial_versions(id)` with `on delete set null`. Naming rules are in `docs/DATABASE.md`. A database built from the old migrations has to be dropped and recreated. Left as they were: `job_stages.status` and `job_llm_calls.status` each hold one value but are part of the operator contract.

### D-109 · 2026-11-11 · active — Comments are allowed when they carry a reason (supersedes D-064, D-067, D-070 for the backend)

The owner could not follow the code with reasons kept only in this file. `//` comments are allowed for what the code cannot say: the race a guard closes, why at-least-once delivery needs a check, a security rule, an external quirk. Block comments, JSDoc and dividers still fail lint (`replo/no-comments`). `docs/HOW_GENERATION_WORKS.md` walks one tutorial through the pipeline by file and function. The same pass renamed the confusing backend modules: `src/jobs/` is `src/worker/`, `modules/generation/` is `modules/jobs/`, the pipeline's stage outputs are `checkpoints`, `TutorialReader` is `VersionAccess`, `TutorialViewer` is `TutorialContentService`, and the `TutorialLibrary` merger is gone (`tutorialCatalog` and `tutorialContent` are separate services). Frontend code still has no comments (D-070). Known gap: RULES §0.3 describes a validate-only vault, but `keys.service.ts` `validate` uses the full `KeyVault`.

### D-110 · 2026-11-11 · active — Account pill in the header; Home shows workspace state

The account control moved from the sidebar foot to a pill at the right of the header. It opens a popover with identity, theme, a link to each settings section with its status, and Sign out (`components/app-shell/user-pill.tsx`). Home is two columns from `lg`: reading on the left, and on the right what a new **course** will run on (key, GitHub, preset), library counts and repositories. The workspace card and shelf read existing endpoints through `useWorkspaceSetup` and the list hooks. One addition to the API: `dashboard.summary.reading` (lessons finished, finished in the last 7 days, quiz answers, correct answers), counted in `learning.repo.readingTotals`; a lesson finished in two versions of a **course** counts once. FR-DASH-1 is amended for it; streaks, heatmaps and hours stay out (D-018). The Library has a client-side toolbar (text, visibility, hide finished, sort) over the pages loaded so far (`features/library/library-filter.ts`). The product app's small single-use files were merged into their users (261 to about 225 source files); the player is grouped into `blocks/`, `commands/`, `lesson/` and `source/`. Tailwind in `next dev` can miss a newly added arbitrary class until the dev server restarts; the production build is unaffected.

### D-111 · 2026-11-16 · active — Product shape and account surface

Replo is a free, individual-only developer-experience app: a repository becomes a knowledge graph, interactive diagrams and a sequenced course. Sign-in is email + password, Google or GitHub; there are no workspaces, roles or teams. A course is private to its owner — the product has no visibility states, share links or public pages. Account deletion is retained (FR-AUTH-3) and cascades every row and blob the account owns, so erasure requests are satisfied without a manual runbook. There is no per-call spend tracking, dollar budget or preset system. **How to apply:** private reads stay user-scoped; account deletion is the one destructive account operation and must be exercised in a DB test.

### D-112 · 2026-11-16 · active — Graph-first generation, mixing Understand-Anything and Archify

The pipeline produces three artefacts in order: a **knowledge graph** (tree-sitter structural facts plus LLM summaries/layers/domains), **guided tours**, and **typed, cited diagrams**. The course is outlined from the graph and tours. Understand-Anything contributes the tree-sitter + LLM hybrid, layers, tours, graph-review and fingerprint ideas; Archify contributes the typed `DiagramSpec`, citation-per-element, validation receipts and the interactive viewer. Diagrams are system-laid-out; the model never writes Mermaid. Stages: `ingest → index → enrich → graph-review → tours → diagrams → outline → lessons → validate → publish`. **How to apply:** diagrams and tours live in the version content, normalised only where queried; the lite path builds diagrams deterministically and skips model-authored types.

### D-113 · 2026-11-16 · active — Grounding is deterministic validation, without a judge

Grounding is the product's trust layer and is cheap now that the structural graph knows every symbol and line. It covers observed vs interpretation, path/symbol/quote checks, fabrication checks, edge-existence checks, diagram resolution, one repair and the draft label. It does not use a separate judge model or a confidence ratio: "confidence" in FR-GEN-8 is deterministic validation coverage. **Why:** a judge on the user's key adds cost and subjectivity without improving the 100%-resolve guarantee. **How to apply:** `ValidationReport` keeps coverage counts; there is no `judge` role or judge checkpoint.

### D-114 · 2026-11-16 · active — Snapshot per generation; no GitHub webhooks

GitHub access is read-only and on demand. A generation downloads one tarball at one commit and pins everything to it. There are no webhooks, push events or commit tracking. If the repository moves, the user reruns; the rerun takes a fresh snapshot and creates a new course version with lineage to the previous one. Uninstall is detected lazily: the next import or rerun fails with a typed GitHub error. **Why:** freshness is a user action, not a background subscription, and the webhook handlers (HMAC, dedupe, installation/repository/push, retries) cost more than they return. **How to apply:** the GitHub App has no webhook URL; private access still mints installation tokens on demand.

### D-115 · 2026-11-16 · active — BYOK vault: envelope encryption with the KEK outside the database

Keys live in a server-side envelope vault: a random per-key DEK encrypts the secret with AES-256-GCM; the KEK lives only in the server secret store, never in the database; rows store ciphertext, nonce, tag and key version; the API returns `…last4` only; the worker decrypts for one job and drops it. **Why:** the worker calls providers unattended, so a purely client-side key is impossible; an external KMS/Vault adds cost and a third dependency for a one-VPS product; the envelope scheme is the smallest design that survives a database leak. **How to apply:** keep `platform/crypto` and `provider_keys`; no plaintext fallback. Rotation re-wraps DEKs under a new KEK version. OpenRouter OAuth (PKCE) can be added later as an optional connect flow; pasting a key stays.

### D-116 · 2026-11-16 · active — One model per course; no spend tracking

A course runs on one user-chosen model; Settings stores the default that pre-fills new courses. Roles may share the model. OpenRouter `:free` models are first-class and recommended. Limits are wall-clock per stage and a token ceiling per job; there is no dollar ceiling, spend row or estimate. **Why:** model choice is simpler to explain as one selection, and token/cost rows were maintenance without a product use. **How to apply:** keep `models.catalog`; resolve a single model id; there is no budget/settle code. The eval gate still decides which models are offered.

### D-117 · 2026-11-16 · active — Analytics dashboard and saved dashboards

Home is an analytics surface: course/generation counts, reading totals, success rate, time-to-ready, model mix and recent activity, each as a number, table and chart at day/week/month granularity. Users can save a named dashboard with its filters. Two tables carry it: `analytics_events` (append-only learning/generation events) and `saved_dashboards` (`name`, `filters` JSONB). Aggregation runs in Postgres with the caller's IANA timezone; the client only renders. **Why:** the owner wants to explore learning and generation data and keep named views. **How to apply:** charts are plain SVG in `features/dashboard/analytics-chart.tsx` — the nonce CSP blocks Recharts' inline styles (D-068) — never compute date buckets in JS; saved dashboards are user-scoped and delete with the user.

### D-118 · 2026-11-16 · active — Admin is a role-gated route group in the product app

The admin UI lives in `apps/product` under `/admin` (inside the `(app)` group, with its own `AdminShell`). `app/(app)/admin/layout.tsx` calls `api.admin.overview()` server-side and `notFound()`s when the session user is not an admin, so a non-admin gets a 404 before the client shell renders (D-077). Access is the `users.role` column, seeded at startup from `ADMIN_EMAILS` (`modules/admin/admin-seed.ts`, run in `main.http.ts`). Pages: overview (users, repositories, courses, jobs in flight, failures 24h, storage), users (search, counts), jobs (status filter, stage, error code), job detail (stage timings), system (database, queues, job counts, storage, version). Metadata only — never decrypted keys, prompts or private source. **Why:** a separate app doubles the deploy and auth surface for one operator; the existing operator routes already prove the pattern (D-077). **How to apply:** no admin procedure is reachable without the role; the gate has cross-user tests (`router.cross-user.integration.test.ts`) and the seeding has a DB test (`admin-seed.integration.test.ts`).

### D-119 · 2026-11-16 · active — The domain term is "course"

Product language is **course**, not tutorial. Code and schema still say `tutorial*`; one expand→backfill→contract migration renames `tutorials`/`tutorial_versions`/`tutorial_source_refs`/`tutorial_lessons` to `courses`/`course_versions`/`course_source_refs`/`course_lessons`, and contracts/routes follow in the same phase. **Why:** renaming before launch is cheaper than after, and a split glossary is hard to undo. **How to apply:** do not add new `tutorial*` names; new code uses `course*`.

### D-120 · 2026-11-16 · active — One product-wide search

`search.all` queries repositories, courses, lesson titles, snapshot file paths and saved dashboard names, grouped by type and ranked (`pg_trgm` + Postgres FTS). There is no public search. **Why:** one search box, not a library-local one; saved dashboards are findable like everything else. **How to apply:** index on write where the source table is mutable (dashboards); file/lesson text comes from snapshot and lesson tables. Keep user scoping in the service layer.

### D-121 · 2026-11-18 · active — Evals gate the graph, not only the index

`tools/evals` is the release gate: thirteen golden repositories with truth sheets; graph coverage and integrity, citation validity (100%), diagram validity (100%), claim support, course coherence, quiz quality, injection resistance and per-size latency/token ceilings; a per-model matrix including free models; CI thresholds and stored artefacts. The evaluator scores the published `CourseContent` document plus the recorded probe answers, so it needs no database and cannot import `apps/api`. **Why:** richer generation can fail in more places than the index; the gate must match what ships. **How to apply:** every allow-listed model must pass the gate; a regression blocks the release. Evals may call real providers; unit/worker tests never do. A free model is offered only after it is named in `freeAllowList`, and `ModelsService` refuses to plan or store one that is absent.

### D-122 · 2026-11-16 · active — Landing is static and has no demo course

The landing site is a static export that describes the product, the graph/diagram experience, BYOK key setup and policies. It has no live data, API calls, embedded player or demo course. **Why:** the owner wants a fully static landing and no implied demo product. **How to apply:** keep copy in `lib/content.tsx`; no API-shaped props or demo fixtures in `apps/landing`.

### D-123 · 2026-11-16 · active — Course rename: one expand→backfill→contract set, contract key `courses`

The rename is applied across the contract, the data model and the code in one slice. `0001_expand_courses.sql` renames the five tutorial tables to `course*`, keeps the old names as compatibility views, and adds `course_id` beside `tutorial_id`; `0002_backfill_courses.sql` copies every id and makes the new columns non-null; `0003_contract_courses.sql` drops the old columns and views and renames the remaining indexes and constraints. The contract exports `Course*` types, the `courses` key and `/courses` + `/course-versions` routes. Backend modules move to `modules/courses`, the worker queue is `generate-course`, and the product routes move to `/courses`. **Why:** the old names appeared in the API, the DB and the UI; a staged data migration avoids a destructive table rebuild and keeps the rename reversible until `0003` runs. **How to apply:** a fresh or existing database applies `0000`–`0003` in order; `db:setup` and the test bootstrap now apply every numbered file. `CourseContent` is still schema v1 — the graph/diagram fields land in the next R1 slice, with an upcast on read.

### D-124 · 2026-11-16 · active — R1b: CourseContent v2, graph/diagram schemas, and the removal pass

`CourseContent` is schema v2: it carries `graph` (nodes/edges), `tours`, typed `diagramSpecs` (architecture, tree, class, ERD, sequence, workflow, dataflow, lifecycle) and the existing chapters/lessons. `upcastCourseContent` parses v1 and returns v2 with empty graph/tours/diagrams, so stored versions keep reading. `0004_schema_v2.sql` drops `webhook_deliveries`, `repository_push_events`, `job_llm_calls`, `course_reports`, the visibility/share columns and the spend/budget columns; it adds `diagram_specs`, `saved_dashboards`, `analytics_events`, `repository_snapshots.graph` and `users.role`. Model preferences become `default_model`; presets, custom role models and budget ceilings are gone. The product import form selects one model, and settings stores the default. **Why:** the product no longer has sharing, a spend ledger or webhooks, and the graph/diagram output needs a typed home. **How to apply:** do not add a share/visibility, budget or webhook column back; a v1 document read through `upcastCourseContent` is always safe.

### D-125 · 2026-11-18 · active — R3 pipeline details: structural edges, one lite rule, path-derived lesson keys

The tree-sitter index now records file-level `call`, `extends` and `implements` edges beside imports and `test_of`; the graph maps them to `calls`, `extends` and `implements`, and the prompt graph shows edges so tours and model diagrams can follow dependencies. `ANALYZER_VERSION` is 2, so snapshots built by version 1 are re-indexed. The lite path is one rule — the model plan is lite or the repository has at most `MAX_LITE_PIPELINE_FILES` files — used by every stage, and the published generator records which path actually ran. Lesson keys are slugs of the lesson's first focus path, so learning progress carries across a rerun that teaches the same file. Model diagram nodes take their label and kind from the graph, and the overview-architecture call is checkpointed like every other paid call. **Why:** these close the R3 gaps around structural insight, consistent lite behaviour and stable progress keys. **How to apply:** when adding an edge kind, extend `EdgeKind`, the graph mapping and the prompt section together; derive new lesson keys from source facts, not model wording.

### D-126 · 2026-11-18 · active — R4 product surface: workspace, analytics events and the removal sweep

The workspace is one route per course (`/workspace/{owner}/{repo}/{slug}?version=`) with graph, tree, table and diagram views; the graph is a layered SVG map plus a keyboard-operable node list, and node/diagram evidence opens the same source panel as the player. Analytics events are written where the facts happen — `job_succeeded`/`job_failed` in `endJob` with the model and wall-clock duration, `lesson_completed` on the completion transition, `quiz_submitted` per answer — and the Postgres report adds success rate, median time to ready and model usage. Active generations poll every five seconds; the job detail keeps the SSE feed. Sharing, visibility, budget, preset and revoke-sessions code and tests are gone from the product. **Why:** R4 is the first surface a reader meets, and an empty analytics page on a real account would be indistinguishable from a broken one. **How to apply:** record an analytics event next to the state change it describes, never from a client; keep the workspace URL state (`view`, `q`, `node`, `diagram`) in search params; a new chart must be SVG with presentation attributes, not inline styles.

### D-127 · 2026-11-18 · active — Landing rebuilt for the graph-first product

The landing now describes the graph, the eight typed diagrams and the course. The demo lesson frame, checker-report example and tutorial copy are gone; the only illustration is `graph-preview.tsx`, a layer-grouping schematic with no repository data, labelled as such. Home sections: Hero · Product · Graph · Diagrams · How it works · Checks · Your key · FAQ · call to action. Copy lives in `lib/content.tsx`, provider rows in `lib/providers.tsx` and named routes in `lib/routes.ts`; the home and key guide share `provider-table.tsx`, and the home and docs share `check-list.tsx`. The takedown page is removed with public courses; policy pages are privacy, terms and licence, still drafts until review. **Why:** D-122 requires a static landing with no demo course, and R1 removed sharing and public courses. **How to apply:** keep the landing free of API-shaped props, demo fixtures, live data and any embedded player; add a home section by adding its copy to `content.tsx` and a component under `components/sections/`.

### D-128 · 2026-11-18 · active — R9 hosts everything on Cloudflare: Workers, Workflows, Neon + Hyperdrive, R2 (ADR-010)

R9 rewrites the deploy plan: API runs as a Worker (Fastify via `cloudflare:node` `httpServerHandler`, `nodejs_compat` default since compatibility date 2026-08-04, `pluginTimeout: 0`, `limits.cpu_ms` raised to 5 min); product deploys through `@opennextjs/cloudflare` (v1.20+, Next.js 16 Node runtime, R2 incremental cache); landing ships as Workers Static Assets; Postgres 17 moves to Neon behind a Hyperdrive binding with the existing `pg`/Drizzle stack unchanged; pipeline stages become durable **Cloudflare Workflows** steps (stage = step, retries with backoff, cancel = instance terminate) replacing pg-boss; reaper/retention/backup run on Cron Triggers. The VPS, Docker Compose, Caddy and pg-boss are retired; ADR-002's pg-boss choice and D-002's pg-boss pin are superseded for the deployed runtime. CI/CD is GitHub Actions with OIDC: PR previews via `wrangler versions upload` on `*.workers.dev`, main auto-deploys through a staged rollout with instant rollback, and the DDL step applies migrations to Neon before the code rollout. **Why:** one platform with no servers to patch, scale-to-zero cost, and Workflows matching the already-checkpointed stage model 1:1. Risks accepted: 128 MB isolate memory bounds large-repo ingest (pre-flight caps `MAX_REPO_FILES`/`MAX_REPO_BYTES` are the guard; the fallback is a Cloudflare Container for ingest/index only); Neon free tier is dev-only. **How to apply:** new queue/schedule code targets Workflows and Cron Triggers, not pg-boss; deploy code goes through `wrangler versions upload/deploy`, never a manual dashboard edit; docs describe Workers topology from R9's first merge onward.

## Assumptions to validate

1. Developers get oriented measurably faster than with DeepWiki/Code Wiki.
2. The lite path on OpenRouter `:free` models is good enough to hook new users.
3. Users will add a key during onboarding when they see the OpenRouter recommendation and its `:free` models. ADR-007 depends on this.
4. The graph/diagram workspace is compelling enough that users return without public pages or paid acquisition.
5. Cloudflare's free-tier Workers limits plus Neon's free/postgres tiers handle launch traffic; the pipeline's isolate memory stays within pre-flight caps.

## Gotchas / things to re-verify when implementing

- **Migration `0003` drops `model_preferences.default_budget_usd`** and adds `default_budget_micros`. The table was never written, so no data is lost; drizzle asked a rename question, which was answered as create-and-drop.

- **Blueprint code is a sketch.** Re-check against installed types: oRPC Fastify adapter options; pg-boss v10 (`createQueue` required before `send`/`work`; `work` handlers receive an **array** of jobs); AI SDK 6 `generateText` + `Output.object`; OpenRouter provider major vs AI SDK major; Better Auth schema generation for the Drizzle adapter.
- **pnpm 11 install failures:** `ERR_PNPM_IGNORED_BUILDS` ⇒ decide `true`/`false` per package in `allowBuilds` (D-011); `ERR_PNPM_NO_MATURE_MATCHING_VERSION` ⇒ lower the range floor (D-010).
- **TypeScript 6:** `types` defaults to `[]` — each tsconfig must list `"types": ["node"]` where needed (set in `packages/config/tsconfig.node.json` / `tsconfig.next.json`).
- **pg-boss 10.4:** `import PgBoss from 'pg-boss'` (default import); `createQueue(name, { name, … })` requires `name` in the options object; `work` handlers receive an array.
- **Base UI `Button`** forces `role="button"` on non-native elements, so it must not render links (D-069). `packages/ui` `Button` no longer takes `render`.
- **Fastify + pino typing:** pass `loggerInstance` typed as pino `Logger`; route modules take `app: App` from `platform/http.ts` (plain `FastifyInstance` is not assignable).
- **Custom oRPC errors need an explicit HTTP status.** Auth now declares 401 for `INVALID_CREDENTIALS` and 409 for `EMAIL_TAKEN` (D-101). Other custom contract errors still declared as `{}` default to 500 and need a separate transport-status review.
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

- **Indexing authorizes on every call** (D-093): `IndexingService.ingest/index` call `authorize()` even for an already-materialised snapshot. A test stub whose `ingestSource` returns undefined fails every job with `REPO_NOT_ACCESSIBLE`.
- **Notification cursors carry microseconds.** The opaque cursor encodes `created_at` with Postgres `to_char` at microsecond precision; a JS `Date` would truncate to milliseconds and break keyset paging for rows in the same millisecond.
- **Mermaid reserved words** (`end`, `graph`, `subgraph`, `style`, `class`, …) are not valid node ids; grounding rejects them as `INVALID_SYNTAX`.
- **e2e mocks must be stateful where the UI refetches.** After a mutation the product invalidates and refetches; a static mock list snaps the screen back to the old value. `e2e/fixtures/handlers.ts` keeps the **course**'s visibility in a closure for that reason.
- **Stages must not commit after an abort.** `withTimeout` waits up to `STAGE_ABORT_GRACE_MS` (5 s) for an aborted stage to settle, then rejects; the publish transaction is fenced by `JobService.fenceRunning` (row lock, status `running`, same attempt), and any stage that persists output after awaiting must call `signal.throwIfAborted()` first.
- **GitHub 403 is retryable, 401 means re-link.** `userCanAccess` returns false only on 404; 401 becomes `GITHUB_RELINK_REQUIRED` (non-retryable) and 403 (rate limit, SSO) becomes retryable `GITHUB_FORBIDDEN`.
- **Learning progress never downgrades a completion**: the upsert's conflict clause skips rows already `completed`, and resume candidates exclude lessons completed in any version in SQL before the limit.
- **Query-string lookups use `Object.hasOwn`.** Maps keyed by `?github=` or `?error=` values must not resolve inherited keys like `__proto__`.
- **`cn()` must know every custom theme token that shares a prefix with a colour.** tailwind-merge reads an unknown `text-*` as a colour, so `cn('text-compact', 'text-muted-foreground')` silently dropped the size and every field hint rendered at 16 px. Custom sizes and tracking are registered in `packages/ui/src/lib/cn.ts`; add new `--text-*`, `--tracking-*`, `--leading-*` or `--shadow-*` tokens there as well.
- **Orphaned `tsx watch` children** can keep port 7200 after a dev server is stopped from the app; check `lsof -ti tcp:7200` before starting another API.

## Open items

- [ ] Real worker-kill run: start the worker, kill it mid-stage, restart, confirm resume from checkpoint (R3 acceptance).
- [ ] Shared rate-limit store before a second API instance (D-058).
- [ ] Decide the read credential for public-repo preflight; unauthenticated GitHub reads are 60/h per IP.
- [ ] Email verification and password reset (needs a mail provider); `emailVerified` stays false for password accounts.
- [ ] Live Google and GitHub sign-in and the Settings link flow in a browser.
- [ ] Accounts with only Google or GitHub cannot add a password, and a provider cannot be disconnected.
- [ ] Choose the domain and set `NEXT_PUBLIC_SITE_URL` and the cookie domain (R9).
- [ ] Create the dev GitHub App (Contents + Metadata read-only, **no webhooks**); setup URL `<API_PUBLIC_URL>/github/setup`.
- [ ] Live generation on a real user key; the call path is tested with the SDK mock only.
- [ ] Decide the CSP policy for inline `style` attributes (D-084).
- [ ] Confirm the landing privacy and terms drafts before launch: contact channel and legal entity.
- [ ] Reconcile PRD NFR-SEC-6 with D-050 (stage outputs vs "prompts not stored").
- [ ] Set `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` in the Cloudflare build.
- [ ] Decide whether the theme needs a "system" option (today: light or dark only).
- [ ] Decide logo and brand assets (DESIGN.md §10).
- [ ] Branch protection on `main`.
- [ ] First live run: `pnpm infra:up && pnpm db:migrate && pnpm dev`.
- [ ] Run the Playwright journey against staging and capture responses for fixtures.
- [ ] Real golden repos with truth sheets (R7); the thirteen synthetic repos exist (D-046).
- [ ] Sentry (free tier) with a redaction check, and Trusted Types (SECURITY.md #11).
- [ ] Production deployment: Cloudflare (Workers, Workflows, OpenNext, Static Assets), Neon + Hyperdrive, R2 backups and alerts, GitHub Actions CI/CD (R9, ADR-010).
