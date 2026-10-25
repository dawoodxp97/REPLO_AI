# Replo — Technical Product Requirements Document

> Status: **Draft v0.3** (22 Oct 2026: BYOK only, no billing, see [ADR-007](./docs/adr/007-byok-only-no-billing.md); legacy-parity decisions in [ADR-008](./docs/adr/008-no-runnable-code-in-r1.md) and [MEM.md](./MEM.md) D-016 to D-027) · Derived from [`Replo_BluePrint.md`](./Replo_BluePrint.md) (14 Oct 2026) · Owner: @Dawood
>
> The blueprint is the research record (alternatives, evidence, sources). **This PRD is the build contract.** When the two disagree, fix the PRD deliberately and note the change in [`MEM.md`](./MEM.md). Requirement IDs (`FR-*`, `NFR-*`) are stable — reference them in commits, tests and PRs.

---

## 1. Summary

**Replo turns a TypeScript/JavaScript GitHub repository into a sequenced, verifiably grounded, interactive tutorial.** A developer pastes a repo URL (or picks a private repo through a read-only GitHub App), chooses one of their own AI keys (OpenRouter recommended; OpenAI, Google AI Studio and Anthropic also work), and within ~10 minutes gets a 5–8 chapter learning path with an architecture diagram, commit-pinned source links on every explanation, and a quiz per chapter.

It is a **free tool for individual developers**, not a team SaaS. It is free for everyone and never charges. It never pays for AI either: every tutorial runs on the user's own key (BYOK only, [ADR-007](./docs/adr/007-byok-only-no-billing.md)). There are no credits, subscriptions, top-ups or ads.

### Why it can win against free AI wikis (DeepWiki, Google Code Wiki)

| #   | Differentiator        | What it means in product terms                                                                                                             |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A path, not a map     | Ordered chapters with objectives, prerequisites and "read this next"                                                                       |
| 2   | Verifiable grounding  | Every claim anchored to a commit-pinned file + line range, machine-checked before publish; unverified claims are labelled _interpretation_ |
| 3   | Task walkthroughs     | "How would I add feature X?" traced through real files _(after validation)_                                                                |
| 4   | Active learning       | Quizzes/exercises built from the repo's own code, with personal progress                                                                   |
| 5   | Your model, your key  | Bring your own key from OpenRouter, OpenAI, Google AI Studio or Anthropic — same grounding checks for every model                          |

## 2. Goals and non-goals

### Goals (Release 1)

1. One coherent loop: **import → generate grounded tutorial → learn with source side-by-side → quiz → share**.
2. **Platform AI cost = $0 by design**: every tutorial runs on a key the user owns (BYOK only, ADR-007).
3. **100% reference validity** after validation, for every model.
4. **Never execute repository code** and never leak private source.
5. Run on **one ~€6–7/month VPS** + Cloudflare free + R2 free tier.

### Non-goals (Release 1) — enforced, not aspirational

Workspaces/roles/team plans/SSO · languages other than TS/JS · executing repo code or generated examples in any sandbox (ADR-008) · tutor chat · embeddings/pgvector retrieval · incremental regeneration on push · manual tutorial editing · interactive dependency graph · mobile apps.

**Never, in any release (ADR-007):** pricing, billing, subscriptions, prepaid credits or top-ups, platform-funded AI (free pool or credits), and ads of any kind. These are not feature-flagged and not "after validation".

## 3. Users and journeys

| Persona                    | Need                                                     | Entry                                                     |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| **OSS learner**            | Understand a codebase to contribute or study patterns    | Public URL import; public tutorial page from search/share |
| **New joiner**             | Private walkthrough of a work repo they can already read | GitHub App install → private repo                         |
| **Student / self-learner** | Study famous projects at no cost                         | Free OpenRouter key and `:free` models (preset `free`)    |

### Core journey (Release 1)

1. Sign in with GitHub.
2. Paste a repo URL **or** pick from repos the GitHub App installation can read.
3. **Pre-flight** (seconds, no LLM): languages, file count, size, detected framework — or a specific refusal reason.
4. Choose **audience level** (newcomer / intermediate / expert), **one of your keys** and a **model preset**; see estimated tokens and cost (your provider's bill).
5. Watch staged progress over SSE: ingest → index → outline → chapters → validation.
6. Land on the tutorial overview; open chapter 1 in the learning player (lesson left, pinned source right).
7. Take the chapter quiz; progress persists; optionally publish publicly or share a private link.

Replo never charges for any step. The only money involved is the user's own provider bill.

## 4. Functional requirements

Priority: **E** = Essential for Release 1 · **V** = after validation · **L** = later. Retired requirements keep their ID with the reason (ADR-007); IDs are never reused.

### 4.1 Accounts and access

| ID        | Requirement                                                                                                                | P   |
| --------- | -------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-AUTH-1 | GitHub sign-in via Better Auth; sessions in own DB; httpOnly + Secure + SameSite=Lax cookies                               | E   |
| FR-AUTH-2 | Individual accounts only — no workspaces, roles or teams anywhere in schema or UI                                          | E   |
| FR-AUTH-3 | Account deletion removes keys, progress, private tutorials and blobs; user chooses to delete or anonymise public tutorials | E   |
| FR-AUTH-4 | Sign out every other session for the user; the current session stays (Better Auth `revokeOtherSessions`) | E   |

### 4.2 Repository import and pre-flight

| ID       | Requirement                                                                                                                                                                             | P   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-IMP-1 | Public import by `https://github.com/<owner>/<repo>` URL (optional ref); job starts in **< 5 s**; the server parses owner/repo and builds API URLs itself (no user-supplied hosts)      | E   |
| FR-IMP-2 | Private import via GitHub App (Contents: read, Metadata: read); user selects individual repos; uninstall hides the user's tutorials for those repos within one webhook cycle            | E   |
| FR-IMP-3 | Pre-flight with Git Trees API: languages, file count, size, detected framework. Unsupported/oversized repos are **refused before any LLM call** with a specific reason                  | E   |
| FR-IMP-4 | Resolve branch/tag → **commit SHA**; pin everything to it. Skip submodules and Git LFS pointers; never install dependencies or run scripts                                              | E   |
| FR-IMP-5 | Single tarball download per SHA; safe extraction (reject abs paths, `..`, symlinks, hardlinks, device entries; byte, entry-count and compression-ratio caps) into a per-job temp dir    | E   |
| FR-IMP-6 | Filtering: exclude `node_modules, vendor, dist, build, out, .next, coverage, .git`, `linguist-generated/vendored`, `.env*`; binaries recorded as metadata only; ≤ 1 MB indexed per file | E   |
| FR-IMP-7 | Repo cap for every user: ~5,000 source files / ~50 MB. The lite pipeline (presets `free` and `budget`) takes repos of ≤ ~300 source files | E |
| FR-IMP-8 | Webhooks (`installation`, `installation_repositories`, `repository`, later `push`): HMAC-SHA256 over raw body, constant-time compare, dedupe on `X-GitHub-Delivery`                     | E   |
| FR-IMP-9 | "Repo changed since this tutorial" banner via push-event path intersection with `tutorial_source_refs`                                                                                  | E   |

### 4.3 Keys, models and budget

| ID        | Requirement                                                                                                                                                                                            | P   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-RUN-1 | Every job runs on exactly one of the user’s stored BYOK keys, chosen before start. Pipeline and validator are identical for all providers and models | E |
| FR-RUN-2 | ~~Free pool: OpenRouter `:free` models, public repos only, 1 tutorial/user/day~~ **Retired (ADR-007).** The platform holds no provider keys | — |
| FR-RUN-3 | BYOK: OpenRouter, OpenAI, Google AI Studio or Anthropic keys. Validated with a test call, stored envelope-encrypted, shown only as `…last4`, deletable immediately, never logged, used only for that user’s jobs | E |
| FR-RUN-4 | A failing BYOK key **never** falls back to another key or provider. Provider base URLs are fixed in code | E |
| FR-RUN-5 | Presets `free · budget · balanced · quality · custom` map roles (planner, author, summarizer) to models. `free` requires an OpenRouter key and `:free` models only. Custom requires catalog models advertising structured outputs or tool calling | E |
| FR-RUN-6 | Before start, show model(s), estimated requests/tokens/cost (the user’s provider bill) and the job budget ceiling (default $2, balanced); estimate comes from the static index | E |
| FR-RUN-7 | ~~Atomic free-quota enforcement~~ **Retired (ADR-007).** There is no platform quota to enforce | — |
| FR-RUN-8 | ~~Free-pool exhaustion message and reset time~~ **Retired (ADR-007).** | — |
| FR-RUN-9 | ~~Prepaid credits (ledger wallet, $10/$20 packs)~~ **Retired: no credits, top-ups or billing, ever (ADR-007).** | — |
| FR-RUN-10 | ~~Global spend kill switch and daily caps on platform-funded spend~~ **Retired (ADR-007):** the platform funds no spend. | — |
| FR-RUN-11 | OpenRouter is the only provider the product recommends (onboarding, key form, docs). OpenAI, Google AI Studio and Anthropic are supported without a recommendation | E |
| FR-RUN-12 | Deleting a key fails every job still running on it with `KEY_REMOVED`. Nothing retries on another key | E |
| FR-RUN-13 | Each LLM call records tokens and cost from the provider’s own usage numbers (`llm_calls`), so the user can compare the estimate with the real bill | E |

### 4.4 Generation pipeline

Stages (see §6): pre-flight → ingest → static index → file summaries → architecture → outline → context packing → lessons+quiz → diagrams → validation/repair → publish.

| ID        | Requirement                                                                                                                                                                   | P   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-GEN-1  | Deterministic staged pipeline with typed (Zod) contracts between stages; LLMs only for summaries, architecture, outline, lessons, quizzes, flow diagrams                      | E   |
| FR-GEN-2  | Every stage is **idempotent and checkpointed** (`job_stages`); retries resume at the last completed stage                                                                     | E   |
| FR-GEN-3  | Validation runs after every LLM stage; ≤ 1 repair per lesson                                                                                                                  | E   |
| FR-GEN-4 | **Lite pipeline** for the `free` and `budget` presets: deterministic summaries, merged architecture+outline call, ≤ 5 chapters, one call per chapter incl. quiz, ≤ 1 repair, ~8–15 requests total | E |
| FR-GEN-5  | Per-job budget reserved at enqueue, checked before each LLM call, settled at end; hard stop at ceiling                                                                        | E   |
| FR-GEN-6  | Audience level is a pipeline **input** (prompt parameter), not a mid-pipeline stage                                                                                           | E   |
| FR-GEN-7  | Structural diagrams are generated from the graph, not by the model; flow diagrams by model then validated                                                                     | E   |
| FR-GEN-8  | Low-confidence output publishes as **Draft** with a visible banner, never fails silently                                                                                      | E   |
| FR-GEN-9  | Custom learning goal ("I want to add X")                                                                                                                                      | V   |
| FR-GEN-10 | Regenerate one chapter; incremental regeneration on push                                                                                                                      | V   |
| FR-GEN-11 | Retry a failed job from its last completed checkpoint (FR-GEN-2); the same snapshot is reused and the job budget (FR-GEN-5) covers only new calls | E   |

### 4.5 Grounding (the core promise)

> **The model points, the system quotes.** The model never writes repo code into a lesson; it references a `symbolKey` or short anchor quote, and the system inserts the exact excerpt and computes line numbers from the index.

| ID       | Requirement                                                                                                                                                                                                                                                                                            | P                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| FR-GRD-1 | Each `prose` block has `kind: observed                                                                                                                                                                                                                                                                 | interpretation`. Observed requires ≥ 1 verified reference; interpretation renders distinctly | E   |
| FR-GRD-2 | Checks: path exists · symbol exists (fuzzy fallback in same file) · anchor quote matches (normalised) · fabricated identifiers (backticked ids vs symbols/files/deps) · execution-flow hops exist as edges · stack contradictions · diagrams parse and map to known symbols · unsafe Markdown stripped | E                                                                                            |
| FR-GRD-3 | On failure: drop reference & flag → one repair → downgrade to interpretation or remove                                                                                                                                                                                                                 | E                                                                                            |
| FR-GRD-4 | Models may emit `openQuestions[]` instead of guessing; shown to learners                                                                                                                                                                                                                               | E                                                                                            |
| FR-GRD-5 | Reproducibility: every ref stores `path`, line range and **blob SHA**; every version stores pipeline version, model IDs, prompt hashes                                                                                                                                                                 | E                                                                                            |
| FR-GRD-6 | Lesson confidence = verified-claim ratio × judge score; stored in `validation_report`                                                                                                                                                                                                                  | E                                                                                            |

### 4.6 Learning experience

| ID        | Requirement                                                                                                                                                | P   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-LRN-1  | Learning player: outline (collapsible) · lesson · pinned source panel (resizable); narrow screens use a bottom drawer for source                           | E   |
| FR-LRN-2  | Source panel: Shiki-highlighted file at pinned commit, cited range highlighted/scrolled, breadcrumb, "Open on GitHub" permalink `/blob/<sha>/<path>#Lx-Ly` | E   |
| FR-LRN-3  | Block types: prose · code · diagram · callout · exercise; every evidence chip opens its source range                                                       | E   |
| FR-LRN-4  | URL holds chapter, lesson and active reference; keyboard shortcuts for next/prev lesson and next reference; command palette                                | E   |
| FR-LRN-5  | Quiz: 3–5 questions per chapter, multiple choice or true/false (MEM D-022); every explanation cites a source reference; the answer key is sent only after an attempt; attempts saved                                                | E   |
| FR-LRN-6  | Progress persists **per tutorial version**; resume opens last unfinished lesson; stable lesson keys carry progress across regenerations                    | E   |
| FR-LRN-7  | Overview page: architecture diagram (Mermaid, lazy, `securityLevel: strict`), outline, objectives, version picker, share                                   | E   |
| FR-LRN-8  | Source explorer at pinned commit (read-only): cited files and the full tree; any text file up to 1 MB (FR-IMP-6)                                                                                           | E   |
| FR-LRN-9  | Banners: repo changed · new version available · draft/low confidence                                                                                       | E   |
| FR-LRN-10 | Code execution: **highlight only** in Release 1                                                                                                            | E   |
| FR-LRN-11 | Tutor chat, code-reading exercises with grading, CodeMirror scratch editor                                                                                 | V   |
| FR-LRN-12 | Progress overview per tutorial (completion, paginated lesson history); unmark a completed lesson (`learning.unmarkLesson`) | E   |

### 4.7 Sharing and public pages

| ID       | Requirement                                                                                                                                                        | P   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-SHR-1 | Visibility `private → link (unguessable token) → public`; checked in the service layer on every read                                                               | E   |
| FR-SHR-2 | Public pages server-render with Open Graph images; only public tutorials get OG images; non-public pages `Cache-Control: private`                                  | E   |
| FR-SHR-3 | Public tutorials only for repos with an OSI-approved licence; licence + attribution shown; report/takedown flow                                                    | E   |
| FR-SHR-4 | ~~EthicalAds slot and house ads~~ **Retired (ADR-007): no ads, anywhere, ever.** | — |
| FR-SHR-5 | Stable slug per tutorial, assigned on first publish and never changed; public URLs are `/tutorials/{owner}/{repo}/{slug}` (see [`docs/API.md`](./docs/API.md)) | E   |

### 4.8 Operator

| ID       | Requirement                                                                                                                 | P   |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-OPS-1 | Admin-only dashboard reading `generation_jobs`, `job_stages`, `llm_calls` | E |
| FR-OPS-2 | Alerts: job failure rate > 20%/h · oldest queued > 15 min · disk > 80% · backup failed · key-validation failure spike | E |
| FR-OPS-3 | Nightly encrypted `pg_dump` to R2, 14-day retention, monthly restore drill                                                  | E   |

### 4.9 Library, home, search, settings and notifications

| ID        | Requirement                                                                                                                                                                                                                                                       | P   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-LIB-1  | "My repositories" and "My tutorials": paginated lists showing job state, visibility and progress; backed by `user_repositories` and the owner's `tutorials`                                                                                                      | E   |
| FR-LIB-2  | Remove a repo from the library: revokes this user's link and deletes this user's tutorials and progress for it, public ones included                                                                                                                             | E   |
| FR-LIB-3  | Delete a tutorial (owner only): removes it with its versions, progress and quiz attempts; its public and link URLs stop resolving; a request from another user returns **404**                                                                                    | E   |
| FR-DASH-1 | Home dashboard: tutorial counts by state, jobs in flight with live progress, resume of the last unfinished lesson, recent activity. Date buckets take the caller's IANA `tz` (default UTC) and are computed in Postgres. No streaks, heatmap or learning-hours metric in R1 (MEM D-018) | E   |
| FR-SRCH-1 | Substring search over the caller's own repositories, tutorials and lesson titles (`pg_trgm`; lesson titles from `lesson_index`, written at publish). Public search is not in R1                                                                                    | E   |
| FR-NTF-1  | In-app notifications when a job succeeds, fails or is canceled; unread count pushed over SSE; list, mark read, mark all read, delete. No email (MEM D-019)                                                                                                       | E   |
| FR-SET-1  | Preferences in `user_preferences`: theme (light or dark), default audience level for new imports, auto-advance to the next lesson, quizzes on or off, browser notifications on or off. Profile shows the GitHub name and avatar only; no bio, location, website or UI language in R1 (MEM D-023) | E   |

## 5. Non-functional requirements

| ID         | Area                 | Requirement                                                                                                                                                                                                     |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-1  | Isolation            | Every private row has `user_id`; services take the session user; `scoped(userId)` helper; CI cross-user tests (A requests B's IDs → **404**)                                                                    |
| NFR-SEC-2  | Repo content         | Treated as **untrusted data, never instructions, never executed**. Model tools are read-only (`search`, `readRange`, `neighbors`) over one snapshot                                                             |
| NFR-SEC-3  | Secrets              | Provider keys AES-256-GCM envelope-encrypted; KEK only in server secret store; decrypted in worker memory for one job; test fails if a key-shaped string reaches logs                                           |
| NFR-SEC-4  | Web                  | Strict CSP with nonces; allow-list Markdown renderer (no raw HTML); links only to repo permalinks or allow-listed domains; CSRF via Origin check                                                                |
| NFR-SEC-5  | Worker               | Non-root, read-only root FS, `noexec` temp volume, `no-new-privileges`, egress allow-list, per-stage timeout and memory limits                                                                                  |
| NFR-SEC-6  | Privacy              | Prompts/completions for private repos are **not stored** (hashes + token counts only); `job_events`/`llm_calls` retained 90 days; tarballs deleted ≤ 24 h                                                       |
| NFR-SEC-7  | Abuse                | Rate limits on sign-in, import and key validation, per user and per IP; over-limit requests return 429 with `Retry-After`                                                                                       |
| NFR-REL-1  | Reliability          | pg-boss delivery is at-least-once; all stages idempotent; heartbeat ~15 s, reaper each minute; classified retries with backoff + jitter                                                                         |
| NFR-REL-2  | Data                 | Job payloads versioned (`v: 1`) and parsed at enqueue **and** dequeue; JSONB content carries `schemaVersion` and is upgraded on read                                                                            |
| NFR-PERF-1 | Latency              | Import accepted < 5 s; p50 time-to-ready ≈ 10 min (measure; target set after eval runs)                                                                                                                         |
| NFR-PERF-2 | Frontend             | Tutorial served **per chapter**; prefetch next lesson; Mermaid/CodeMirror loaded only when visible; virtualise long source files                                                                                |
| NFR-A11Y-1 | Accessibility        | Keyboard-complete player; Base UI primitives; focusable code blocks announcing line ranges; diagrams have caption + text steps; reduced-motion; contrast checked in both themes; Lighthouse a11y ≥ 90 on player |
| NFR-COST-1 | Cost | Fixed platform cost ≤ ~€7/month. The platform never pays for AI and never bills users (ADR-007) |
| NFR-OBS-1  | Observability        | pino JSON to stdout; Sentry free tier; **never** source code, private prompts or keys in logs                                                                                                                   |
| NFR-OBS-2  | Observability        | Request id (`X-Request-ID`) on every log line and echoed in every error body; no source, prompt or key in either                                                                                                  |
| NFR-DX-1   | Developer experience | `pnpm dev` runs landing + product + api + worker; CI < ~10 min; boundary-lint fails on a forbidden import                                                                                                       |

## 6. System design (summary)

Full detail: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`docs/DATABASE.md`](./docs/DATABASE.md), [`docs/API.md`](./docs/API.md).

```
Browser → Cloudflare (DNS/TLS/CDN) ─┬─ apps/landing  (static export, Cloudflare Pages)
                                    └─ Caddy → apps/product (Next.js standalone)
                                             → apps/api     (Fastify + oRPC + Better Auth + SSE + webhooks)
         apps/api worker (pg-boss) ─ Postgres 17 (records + queue) ─ R2 (blobs, backups)
                                   ─ GitHub (repo-scoped token) ─ the user's own provider key (BYOK only)
```

- **Modular monolith, two processes** from one `apps/api` package (`main.http.ts`, `main.worker.ts`).
- **Contract-first**: `packages/contracts` (Zod 4 + oRPC) is the _only_ thing frontend and backend share.
- **Pipeline** (`generation` module): `0 pre-flight → 1 ingest → 2 index → 3 summaries → 4 architecture → 5 outline → 6 context pack → 7 lessons+quiz → 8 diagrams → 9 validate/repair → 10 publish`. Critical path 2 → 4 → 5; parallelism in 3 and 7–9 under a per-job concurrency cap.
- **Job state machine**: `queued → running → (waiting_retry | stalled) → succeeded | failed | canceled` (`canceling` transitional).
- **Progress** to browser: SSE `GET /jobs/:id/events`, event id = `job_events.id`, replay via `Last-Event-ID`, TanStack Query polling fallback.

### Tutorial content model

One immutable, schema-versioned JSONB document per `tutorial_version` (`TutorialContent`, defined in `packages/contracts/src/tutorial/content.ts`): `meta`, `chapters → lessons → blocks (+ quiz)`, `sourceRefs`, `furtherReading`, `openQuestions`. Stable keys (`chapterKey`, `lessonKey`, `questionKey`, `refId`) enable partial regeneration, progress carry-over and version diffs. Anything queried across documents is normalised (`tutorial_source_refs`, `learning_progress`, `quiz_attempts`).

## 7. Data model (summary)

Postgres 17 + Drizzle. Chain: `repository → snapshot (commit SHA + analyzer_version) → tutorial_version` (pinned to exactly one snapshot, records models used). Tables: Better Auth core · `github_installations` · `repositories` · `user_repositories` · `provider_keys` · `model_preferences` · `repo_snapshots` · `snapshot_files` · `symbols` · `file_edges` · `generation_jobs` · `job_stages` · `job_events` · `llm_calls` · `tutorials` · `tutorial_versions` · `tutorial_source_refs` · `learning_progress` · `quiz_attempts` · `lesson_index` · `notifications` · `user_preferences` · `webhook_deliveries` (+ `chunks` in phase 2). See [`docs/DATABASE.md`](./docs/DATABASE.md).

## 8. API surface (Release 1)

oRPC procedures: `me.get` · `github.{installUrl,listRepos}` · `keys.{list,add,validate,delete}` · `models.{catalog,getPreferences,setPreferences}` · `repositories.{preflight,import}` · `jobs.{get,cancel,retry}` · `tutorials.{list,get,getChapter,getSource,setVisibility,createShareLink,delete}` · `learning.{getProgress,markLesson,unmarkLesson,submitQuiz}` · `repositories.{list,remove}` · `search.own` · `dashboard.{summary,recent}` · `notifications.{list,unreadCount,markRead,markAllRead,delete}` · `settings.{get,update}`.
REST/SSE: `/api/auth/*` · `GET /jobs/:id/events` · `POST /webhooks/github` · `GET /healthz` · `GET /readyz`. Details and auth rules: [`docs/API.md`](./docs/API.md).

## 9. Cost and keys

| Run | Who pays the AI provider | Platform limit |
| --- | --- | --- |
| Every job (all presets) | The user, through their own key | None set by Replo. The user's budget ceiling (default $2) and their provider's own limits apply |

- The estimate shown before each run is the user's provider bill, not Replo's cost.
- Reference cost per tutorial on default frontier routing (estimate, replace with measured data after ~50 runs): small ≈ $2.55 · medium ≈ $3.85 · large ≈ $5.40. With `:free` models on OpenRouter the bill is $0.
- Cost levers for the user, in order: `free` or `budget` preset → Sonnet instead of Opus for the planner → Haiku for lessons if evals hold. Reuse of public tutorials is the only cost saving Replo controls.

## 10. Success metrics (targets to validate, not benchmarks)

Activation (sign-ups reaching a finished tutorial) · generation success rate + p50/p95 time-to-ready · **grounding precision** (100% resolve; ≥ 95% observed claims supported) · engagement (chapter-1 and full completion, quiz attempt rate) · perceived value ("how much faster could you find your way around?" + 7-day return) · estimate accuracy against the provider bill (median/p95) · key-setup completion (signed in → first key added) · share of keys added for OpenRouter.

## 11. Delivery plan

Walking skeleton by ~week 6 (public URL → job → tarball → one validated outline returned by the API, with working source links), then deepen. Delivery is sequenced: backend (B0–B9), then frontend (F0–F7), then landing (L1), then deploy and maintain (O1–O3). Phases and acceptance criteria are in [`ROADMAP.md`](./ROADMAP.md). **Definition of done per phase:** merged behind tests · deployed to staging · visible on the dashboard · runbook/README updated · no open critical threat-model items for that phase.

## 12. Risks (top)

| Risk                                     | Mitigation                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Incumbents ship a "tutorial mode"        | Lead with grounding guarantees, measured learning outcomes, model/cost choice                                                            |
| Weak models produce weak tutorials | Lite pipeline for the `free` and `budget` presets; eval-gated `free` allow-list; Draft label; OpenRouter recommendation for cheap and free models |
| Users drop off at key setup (no free tier to try first) | OpenRouter recommendation with a key guide in the import flow; key-setup funnel tracked (§10) |
| User API key leaks                       | Envelope encryption, KEK outside DB, redaction tests, immediate delete — **build and test the vault before the first user pastes a key** |
| Quality on large/messy repos             | Scope to sub-directory, golden-set evals by size, honest refusals                                                                        |
| Small team over-scopes                   | Walking skeleton first; Non-goals list enforced in review                                                                                |

## 13. Open questions (resolve via experiments E1–E8 in the blueprint §18.3)

Which user segment engages most · which learning block types get used · acceptable generation time (resolved: no email in R1, MEM D-019) · ideal tutorial length for medium repos ("first hour" path?) · tutor chat expected at launch? · second language demand (deferred, MEM D-023) · which providers and models BYOK users pick · whether users finish key setup without a free trial · organic traffic from public tutorials.

## 14. Release-1 acceptance checklist

- [ ] Public URL → finished tutorial with live SSE progress; crash/retry/cancel proven
- [ ] 100% of source refs resolve post-validation on every allow-listed model (eval suite)
- [ ] BYOK key never appears in logs or API responses (tests)
- [ ] A job uses only the key it started with; deleting that key fails the job with `KEY_REMOVED` (test)
- [ ] Cross-user access returns 404 (CI)
- [ ] Forged webhook rejected; zip-slip/symlink/bomb fixtures rejected
- [ ] Playwright journey: sign in → import fixture → progress → read lesson → quiz → share
- [ ] Restore drill completed; alerts fire in staging chaos test
- [ ] Threat-model checklist ([`SECURITY.md`](./SECURITY.md)) signed off
