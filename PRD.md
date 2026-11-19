# Replo — Technical Product Requirements Document

> Status: **Current plan** (16 Nov 2026). Owner: @Dawood
>
> Sources and alternatives are in [`Replo_BluePrint.md`](./docs/archive/Replo_BluePrint.md). **This PRD is the build contract.** When the two disagree, fix the PRD deliberately and note the change in [`MEM.md`](./docs/archive/MEM.md). Requirement IDs (`FR-*`, `NFR-*`) are stable — reference them in commits, tests and PRs.

---

## 1. Summary

**Replo turns a GitHub repository into an explorable knowledge graph, a set of interactive architecture diagrams, and a sequenced course with quizzes.** A developer pastes a repo URL (or picks a private repo through a read-only GitHub App), chooses one of their own AI keys (OpenRouter recommended, including `:free` models; OpenAI, Google AI Studio and Anthropic also work), and gets:

1. **A graph** of the repository: files, symbols, modules, external dependencies, layers, domains and guided tours.
2. **Diagrams** generated from the graph or authored by the model and validated against it: architecture, tree, class, ERD, sequence, workflow, dataflow and lifecycle.
3. **A course** of chapters, lessons and quizzes, where every claim points at a commit-pinned file and line range and the system inserts the quoted code.

It is a **free tool for individual developers** — a developer-experience app, not a team SaaS. It never charges and never funds AI: every generation runs on the user's own key (BYOK).

## 2. Goals (Release 1)

1. One coherent loop: **import → understand (graph + diagrams) → learn (course + quizzes) → dashboard**.
2. **Platform AI cost = $0 by design**: every generation runs on a key the user owns.
3. **Every published reference resolves**: 100% of course citations and diagram edges validate against the snapshot index.
4. **Never execute repository code** and never leak private source.
5. Run on **one ~€6–7/month VPS** + Cloudflare free + R2 free tier.

## 3. Users and journeys

| Persona                    | Need                                                     | Entry                             |
| -------------------------- | -------------------------------------------------------- | --------------------------------- |
| **OSS learner**            | Understand a codebase to contribute or study patterns    | Public URL import                 |
| **New joiner**             | Private walkthrough of a work repo they can already read | GitHub App install → private repo |
| **Student / self-learner** | Study famous projects at no cost                         | OpenRouter `:free` models         |

### Core journey (Release 1)

1. Sign in with GitHub, Google, or an email address and password.
2. Paste a repo URL **or** pick from repos the GitHub App installation can read.
3. **Pre-flight** (seconds, no LLM): languages, file count, size, detected framework — or a specific refusal reason.
4. Choose **audience level** (newcomer / intermediate / expert) and a **model** (default comes from Settings; switchable per course).
5. Watch staged progress over SSE: ingest → index → enrich → graph review → tours → diagrams → outline → lessons → validate → publish.
6. Land on the **repository workspace**: graph, tree, diagrams, tours and the course outline.
7. Read chapters in the **course player** (lesson left, pinned source right), take chapter quizzes, and resume where they left off.
8. See their learning and generation analytics on the **dashboard**, and every in-flight generation on the **active generations** page.

## 4. Functional requirements

Priority: **E** = essential for Release 1.

### 4.1 Accounts and access

| ID        | Requirement                                                                                                                                                                                                                   | P   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-AUTH-1 | Sign in with GitHub, Google, or email and password (own code, ADR-009); opaque sessions in own DB, hashed; httpOnly + Secure + SameSite=Lax cookies; OAuth uses PKCE and state                                                | E   |
| FR-AUTH-2 | Individual accounts only — no workspaces, roles or teams anywhere in the user-facing schema or UI                                                                                                                             | E   |
| FR-AUTH-3 | **Delete account**: removes the account's keys, GitHub links, repositories and snapshots, generations, courses, progress, quiz attempts, notifications and blobs in one cascade; requires a typed confirmation (GDPR erasure) | E   |
| FR-AUTH-5 | A GitHub-signed-in user may import private repositories; users who signed in another way see public repositories only                                                                                                         | E   |

### 4.2 Repository import and snapshot

| ID        | Requirement                                                                                                                                                                                                                                       | P   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-IMP-1  | Public import by `https://github.com/<owner>/<repo>` URL (optional ref); job starts in **< 5 s**; the server parses owner/repo and builds API URLs itself (no user-supplied hosts)                                                                | E   |
| FR-IMP-2  | Private import via GitHub App (Contents: read, Metadata: read); user selects individual repos; installation tokens fetched on demand — no webhook dependency                                                                                      | E   |
| FR-IMP-3  | Pre-flight with Git Trees API: languages, file count, size, detected framework. Unsupported/oversized repos are **refused before any LLM call** with a specific reason                                                                            | E   |
| FR-IMP-4  | Resolve branch/tag → **commit SHA**; pin everything to it. Skip submodules and Git LFS pointers; never install dependencies or run scripts                                                                                                        | E   |
| FR-IMP-5  | Single tarball download per SHA; safe extraction (reject abs paths, `..`, symlinks, hardlinks, device entries; byte, entry-count and compression-ratio caps) into a per-job temp dir                                                              | E   |
| FR-IMP-6  | Filtering: exclude `node_modules, vendor, dist, build, out, .next, coverage, .git`, `linguist-generated/vendored`, `.env*`; binaries recorded as metadata only; ≤ 1 MB indexed per file                                                           | E   |
| FR-IMP-7  | Repo cap for every user: ~5,000 source files / ~50 MB; a lite path handles repos of ≤ ~300 source files                                                                                                                                           | E   |
| FR-IMP-10 | **Snapshot-only**: the product never tracks a repository's commits or subscribes to webhooks. If the repository changes, the user reruns generation. A rerun creates a new snapshot and a new course version linked to the previous one (lineage) | E   |

### 4.3 Keys, models and limits

| ID        | Requirement                                                                                                                                                                                                                                 | P   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-RUN-1  | Every job runs on exactly one of the user's stored BYOK keys, chosen before start. The pipeline and validator are identical for all providers and models                                                                                    | E   |
| FR-RUN-3  | BYOK: OpenRouter (including `:free` models), OpenAI, Google AI Studio or Anthropic keys. Validated with a test call, stored envelope-encrypted, shown only as `…last4`, deletable immediately, never logged, used only for that user's jobs | E   |
| FR-RUN-4  | A failing BYOK key **never** falls back to another key or provider. Provider base URLs are fixed in code                                                                                                                                    | E   |
| FR-RUN-5  | **Model selection**: the user picks one model per course before start; the default comes from Settings. Roles (planner, author, summarizer) may share that model. `free` models from OpenRouter are first-class                             | E   |
| FR-RUN-11 | OpenRouter is the only provider the product recommends (onboarding, key form, docs), including free models. OpenAI, Google AI Studio and Anthropic are supported without a recommendation                                                   | E   |
| FR-RUN-12 | Deleting a key fails every job still running on it with `KEY_REMOVED`. Nothing retries on another key                                                                                                                                       | E   |
| FR-RUN-14 | **Vault**: keys are envelope-encrypted (AES-256-GCM, random per-key DEK, KEK outside the database). The API may decrypt in memory only to validate; the worker decrypts for one job and drops it. Rotation is by key version                | E   |
| FR-RUN-15 | **Per-job limits**: a generation stops at a wall-clock and token ceiling. There is no spend ledger, cost estimate or dollar budget in the product                                                                                           | E   |

### 4.4 Generation pipeline

Stages (see §6): pre-flight → ingest → index → enrich → graph review → tours → diagrams → outline → lessons → validate → publish.

| ID        | Requirement                                                                                                                                                                                                                                              | P   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-GEN-1  | Deterministic staged pipeline with typed (Zod) contracts between stages; LLMs only for semantic enrichment, tours, model-authored diagrams, outline, lessons and quizzes                                                                                 | E   |
| FR-GEN-2  | Every stage is **idempotent and checkpointed** (`job_stages`); retries resume at the last completed stage                                                                                                                                                | E   |
| FR-GEN-3  | Validation runs after every LLM stage; ≤ 1 repair per lesson and per diagram                                                                                                                                                                             | E   |
| FR-GEN-4  | **Lite path** for small repos and free models: deterministic summaries, merged enrichment+outline call, ≤ 5 chapters, one call per chapter incl. quiz, ≤ 1 repair, system-built diagrams only                                                            | E   |
| FR-GEN-5  | **Per-job limits** enforced before each model call from FR-RUN-15; hard stop at the ceiling, job fails with a specific code                                                                                                                              | E   |
| FR-GEN-6  | Audience level is a pipeline **input** (prompt parameter), not a mid-pipeline stage                                                                                                                                                                      | E   |
| FR-GEN-8  | Low-confidence output publishes as **Draft** with a visible banner, never fails silently. "Confidence" is the deterministic validation coverage, not an LLM judge score                                                                                  | E   |
| FR-GEN-11 | Retry a failed job from its last completed checkpoint (FR-GEN-2); the same snapshot is reused and the limit covers only new calls                                                                                                                        | E   |
| FR-GEN-12 | **Structural graph**: tree-sitter (WASM) extracts files, symbols (function/class/type), imports, calls, `extends`/`implements`, and module/package boundaries. Same input → same graph                                                                   | E   |
| FR-GEN-13 | **Semantic enrichment**: the model adds file/symbol summaries, architectural layers (api/service/data/ui/util), business domains, flows and language concepts, batched and checkpointed                                                                  | E   |
| FR-GEN-14 | **Graph review**: deterministic coverage and referential-integrity checks (every edge endpoint exists; every cited symbol belongs to the file; no dangling tour step); one repair pass for gaps                                                          | E   |
| FR-GEN-15 | **Guided tours**: dependency-ordered learning paths with objectives and steps, built from the graph — the "start here, read this next" order                                                                                                             | E   |
| FR-GEN-16 | **Typed diagrams**: a Zod `DiagramSpec` union for architecture, tree, class, ERD, sequence, workflow, dataflow and lifecycle. System-built where the graph has the facts; model-authored and validated where it does not. The model never writes Mermaid | E   |
| FR-GEN-17 | **Outline from the graph**: chapters map to tours/domains, lessons map to nodes and edges, so every lesson has a structural anchor                                                                                                                       | E   |

### 4.5 Grounding and validation (the trust layer)

> **The model points, the system quotes.** The model never writes repo code into a lesson; it references a `symbolKey` or short anchor quote, and the system inserts the exact excerpt and computes line numbers from the index.

| ID       | Requirement                                                                                                                                                                                                                                   | P   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-GRD-1 | Each `prose` block is `kind: observed` or `kind: interpretation`. Observed requires ≥ 1 verified reference; interpretation renders distinctly                                                                                                 | E   |
| FR-GRD-2 | Checks: path exists · symbol exists (fuzzy fallback in same file) · anchor quote matches (normalised) · fabricated identifiers · execution-flow hops exist as edges · diagram nodes/edges resolve to known symbols · unsafe Markdown stripped | E   |
| FR-GRD-3 | On failure: drop reference & flag → one repair → downgrade to interpretation or remove                                                                                                                                                        | E   |
| FR-GRD-4 | Models may emit `openQuestions[]` instead of guessing; shown to learners                                                                                                                                                                      | E   |
| FR-GRD-5 | Reproducibility: every ref stores `path`, line range and **blob SHA**; every version stores pipeline version, model IDs, prompt hashes                                                                                                        | E   |
| FR-GRD-7 | **Diagram validation**: every node and edge in a `DiagramSpec` resolves to graph nodes or verified refs; the system lays out and renders the diagram, never the model                                                                         | E   |

### 4.6 Workspace, course player and learning

| ID        | Requirement                                                                                                                                                                                                            | P   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-WKS-1  | **Repository workspace**: one page for a snapshot with three views — graph (layer-grouped), file tree, and table — plus search/filter and a node detail card (summary, code excerpt, incoming/outgoing edges, refs)    | E   |
| FR-WKS-2  | **Diagram viewer**: renders each `DiagramSpec` interactively (pan/zoom, focus a node, follow a path, upstream/downstream reach, evidence chips that open the source panel); keyboard-complete and reduced-motion aware | E   |
| FR-WKS-3  | **Tours**: the guided-tour list with objectives and steps; each step opens the node or the course lesson it belongs to                                                                                                 | E   |
| FR-LRN-1  | Learning player: outline (collapsible) · lesson · pinned source panel (resizable); narrow screens use a bottom drawer for source                                                                                       | E   |
| FR-LRN-2  | Source panel: Shiki-highlighted file at pinned commit, cited range highlighted/scrolled, breadcrumb, "Open on GitHub" permalink `/blob/<sha>/<path>#Lx-Ly`                                                             | E   |
| FR-LRN-3  | Block types: prose · code · diagram · callout · exercise; every evidence chip opens its source range                                                                                                                   | E   |
| FR-LRN-4  | URL holds chapter, lesson and active reference; keyboard shortcuts for next/prev lesson and next reference; command palette                                                                                            | E   |
| FR-LRN-5  | Quiz: 3–5 questions per chapter, multiple choice or true/false; every explanation cites a source reference; the answer key is sent only after an attempt; attempts saved                                               | E   |
| FR-LRN-6  | Progress persists **per course version**; resume opens the last unfinished lesson; stable lesson keys carry progress across regenerations                                                                              | E   |
| FR-LRN-7  | Overview page: architecture diagram (lazy, `securityLevel: strict`), outline, objectives, version picker                                                                                                               | E   |
| FR-LRN-8  | Source explorer at pinned commit (read-only): cited files and the full tree; any text file up to 1 MB                                                                                                                  | E   |
| FR-LRN-9  | Banners: new version available · draft/incomplete validation. No "repo changed" banner (no commit tracking, FR-IMP-10)                                                                                                 | E   |
| FR-LRN-10 | Code execution: **highlight only** in Release 1                                                                                                                                                                        | E   |
| FR-LRN-12 | Progress overview per course (completion, paginated lesson history); unmark a completed lesson                                                                                                                         | E   |

### 4.7 Library, dashboard, search, active generations, notifications and settings

| ID        | Requirement                                                                                                                                                                                                                         | P   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-LIB-1  | **Repositories** and **Courses** lists (no "My" wording): counts of repositories, generations and courses, job state, last activity, progress                                                                                       | E   |
| FR-LIB-2  | Remove a repository: deletes its snapshots, generations, courses and progress for this account (cascade)                                                                                                                            | E   |
| FR-LIB-3  | Delete a course (owner only): removes it with its versions, progress and quiz attempts; a request from another user returns **404**                                                                                                 | E   |
| FR-DASH-1 | **Dashboard**: course counts by state, generations in flight, resume of the last unfinished lesson, reading totals, recent activity, and generation analytics (success rate, time-to-ready, model usage)                            | E   |
| FR-DASH-2 | **Charts and timelines**: every metric is available as a number, table and chart (line/bar) at day, week and month granularity; date buckets take the caller's IANA `tz` (default UTC) and are computed in Postgres                 | E   |
| FR-DASH-3 | **Saved dashboards**: the user names a dashboard and saves its filters; saved dashboards are listed, reopenable, searchable and deletable                                                                                           | E   |
| FR-SRCH-1 | **Global search** across repositories, courses, lesson titles, snapshot files and saved dashboards, ranked and grouped by type (`pg_trgm` + Postgres FTS)                                                                           | E   |
| FR-JOB-1  | **Active generations**: a live page listing every in-flight generation with stage, progress, elapsed time and owner-visible controls (cancel), updated over SSE                                                                     | E   |
| FR-NTF-1  | In-app notifications when a job succeeds, fails or is canceled; unread count pushed over SSE; list, mark read, mark all read, delete. No email                                                                                      | E   |
| FR-SET-1  | Preferences in `user_preferences`: theme (light or dark), default audience level, default model, auto-advance to the next lesson, quizzes on or off, browser notifications on or off. Profile shows the GitHub name and avatar only | E   |
| FR-SET-2  | Settings holds the **default model** used to pre-fill every new course; changing it never changes a course already running                                                                                                          | E   |

### 4.8 Admin (operator only)

| ID       | Requirement                                                                                                                                                                 | P   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-OPS-1 | **Admin UI** on a separate route group, gated by a server-side role check before the client shell renders: overview of users, repositories, generations, storage and errors | E   |
| FR-OPS-4 | **Jobs and queues**: all users' jobs with filters (state, stage, model, error code), stage timings, queue depth, cron schedules and next run times                          | E   |
| FR-OPS-2 | Alerts: job failure rate > 20%/h · oldest queued > 15 min · disk > 80% · backup failed · key-validation failure spike                                                       | E   |
| FR-OPS-3 | Nightly encrypted `pg_dump` to R2, 14-day retention, monthly restore drill                                                                                                  | E   |
| FR-OPS-5 | Admin never sees decrypted provider keys, private prompts or private source; admin reads metadata, counts, timings and error codes only                                     | E   |

## 5. Non-functional requirements

| ID         | Area                 | Requirement                                                                                                                                                                                                                                 |
| ---------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-1  | Isolation            | Every private row has `user_id`; services take the session user; `scoped(userId)` helper; CI cross-user tests (A requests B's IDs → **404**)                                                                                                |
| NFR-SEC-2  | Repo content         | Treated as **untrusted data, never instructions, never executed**. Model tools are read-only (`search`, `readRange`, `neighbors`) over one snapshot                                                                                         |
| NFR-SEC-3  | Secrets              | Provider keys AES-256-GCM envelope-encrypted; KEK only in server secret store; decrypted in worker memory for one job; test fails if a key-shaped string reaches logs                                                                       |
| NFR-SEC-4  | Web                  | Strict CSP with nonces; allow-list Markdown renderer (no raw HTML); links only to repo permalinks or allow-listed domains; CSRF via Origin check                                                                                            |
| NFR-SEC-5  | Worker               | Non-root, read-only root FS, `noexec` temp volume, `no-new-privileges`, egress allow-list, per-stage timeout and memory limits                                                                                                              |
| NFR-SEC-6  | Privacy              | Prompts/completions for private repos are **not stored** (hashes + token counts only); `job_events` retained 90 days; tarballs deleted ≤ 24 h                                                                                               |
| NFR-SEC-7  | Abuse                | Rate limits on sign-in, import and key validation, per user and per IP; over-limit requests return 429 with `Retry-After`                                                                                                                   |
| NFR-REL-1  | Reliability          | pg-boss delivery is at-least-once; all stages idempotent; heartbeat ~15 s, reaper each minute; classified retries with backoff + jitter                                                                                                     |
| NFR-REL-2  | Data                 | Job payloads versioned (`v: 1`) and parsed at enqueue **and** dequeue; JSONB content carries `schemaVersion` and is upgraded on read                                                                                                        |
| NFR-PERF-1 | Latency              | Import accepted < 5 s; p50 time-to-ready ≈ 10 min (measure; target set after eval runs)                                                                                                                                                     |
| NFR-PERF-2 | Frontend             | Course served **per chapter**; prefetch next lesson; graph and diagrams virtualised/lazy; Mermaid/CodeMirror loaded only when visible                                                                                                       |
| NFR-A11Y-1 | Accessibility        | Keyboard-complete player and workspace; Base UI primitives; focusable code blocks announcing line ranges; diagrams have caption + text steps; reduced-motion; contrast checked in both themes; Lighthouse a11y ≥ 90 on player and workspace |
| NFR-COST-1 | Cost                 | Fixed platform cost ≤ ~€7/month. The platform never pays for AI and never bills users                                                                                                                                                       |
| NFR-OBS-1  | Observability        | pino JSON to stdout; Sentry free tier; **never** source code, private prompts or keys in logs                                                                                                                                               |
| NFR-OBS-2  | Observability        | Request id (`X-Request-ID`) on every log line and echoed in every error body; no source, prompt or key in either                                                                                                                            |
| NFR-DX-1   | Developer experience | `pnpm dev` runs landing + product + api + worker; CI < ~10 min; boundary-lint fails on a forbidden import                                                                                                                                   |

## 6. System design (summary)

Full detail: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`docs/DATABASE.md`](./docs/DATABASE.md), [`docs/API.md`](./docs/API.md).

```
Browser → Cloudflare (DNS/TLS/CDN) ─┬─ apps/landing  (static export, Cloudflare Pages)
                                    └─ Caddy → apps/product (Next.js standalone)
                                             → apps/api     (Fastify + oRPC + own auth + SSE)
         apps/api worker (pg-boss) ─ Postgres 17 (records + queue) ─ R2 (blobs, backups)
                                   ─ GitHub (repo-scoped token, on demand) ─ the user's own provider key (BYOK only)
```

- Modular monolith, two processes from one `apps/api` package (`main.http.ts`, `main.worker.ts`).
- Contract-first: `packages/contracts` (Zod 4 + oRPC) is the _only_ thing frontend and backend share.
- **Pipeline** (`generation` module): `0 pre-flight → 1 ingest → 2 index → 3 enrich → 4 graph review → 5 tours → 6 diagrams → 7 outline → 8 lessons+quiz → 9 validate/repair → 10 publish`. Critical path `2 → 3 → 5/6/7 → 8 → 9`.
- **Job state machine**: `queued → running → (waiting_retry | stalled) → succeeded | failed | canceled` (`canceling` transitional).
- Progress to browser: SSE `GET /jobs/:id/events`, event id = `job_events.id`, replay via `Last-Event-ID`, TanStack Query polling fallback.

### Content model

One immutable, schema-versioned JSONB document per `course_version` (`CourseContent`, defined in `packages/contracts/src/course/content.ts`): `meta`, `graph` (nodes/edges/layers/domains), `tours`, `diagrams`, `chapters → lessons → blocks (+ quiz)`, `sourceRefs`, `openQuestions`. Stable keys (`chapterKey`, `lessonKey`, `questionKey`, `refId`) enable reruns, progress carry-over and version diffs. Anything queried across documents is normalised (`course_source_refs`, `course_lessons`, `diagram_specs`, `learning_progress`, `quiz_attempts`).

## 7. Data model (summary)

Postgres 17 + Drizzle. Chain: `repository → snapshot (commit SHA + analyzer_version) → course_version` (pinned to exactly one snapshot, records models used).

Tables: `user` · `session` · `auth_identities` · `github_installations` · `repositories` · `user_repositories` · `provider_keys` · `model_preferences` · `repository_snapshots` · `snapshot_files` · `snapshot_symbols` · `snapshot_file_edges` · `generation_jobs` · `job_stages` · `job_events` · `courses` · `course_versions` · `course_source_refs` · `course_lessons` · `diagram_specs` · `learning_progress` · `quiz_attempts` · `notifications` · `user_preferences` · `saved_dashboards` · `analytics_events`.

Course tables: `courses`, `course_versions`, `course_source_refs`, `course_lessons`, `diagram_specs`. There is no webhook, spend-ledger or visibility storage. See [`docs/DATABASE.md`](./docs/DATABASE.md).

## 8. API surface (Release 1)

oRPC procedures:

- `auth.{providers,signUp,signIn,signOut}` (no revoke-other-sessions)
- `me.{get,deleteAccount}`
- `github.{installUrl,listRepos}`
- `keys.{list,add,validate,delete}`
- `models.{catalog,getPreferences,setPreferences}`
- `repositories.{preflight,import,list,remove,rerun}`
- `jobs.{get,listActive,cancel,retry}`
- `courses.{list,get,getChapter,getSource,delete}`
- `workspace.{graph,node,diagram,tree}`
- `learning.{getProgress,markLesson,unmarkLesson,submitQuiz}`
- `search.all`
- `dashboard.{summary,recent,analytics,save,listDashboards,deleteDashboard}`
- `notifications.{list,unreadCount,markRead,markAllRead,delete}`
- `settings.{get,update}`
- `admin.{overview,users,jobs,job,queues,system}`

REST: `/auth/:provider/{start,callback}` · `GET /jobs/:id/events` · `GET /notifications/stream` · `GET /healthz` · `GET /readyz`. **No webhook endpoint.** Details and auth rules: [`docs/API.md`](./docs/API.md).

## 9. Cost and keys

| Run                    | Who pays the AI provider        | Platform limit                                                                                  |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Every job (all models) | The user, through their own key | None set by Replo. Per-job wall-clock and token ceilings apply; the provider's own limits apply |

- The product does **not** record spend, show a dollar estimate or enforce a dollar budget.
- With OpenRouter `:free` models the user's bill is $0.
- Reference cost is the user's provider bill, not a Replo cost. Replo's own fixed cost stays ≤ ~€7/month.

## 10. Success metrics

Activation (sign-ups reaching a finished course) · generation success rate + p50/p95 time-to-ready · **graph coverage** (files/symbols/edges represented) · **citation validity** (100% resolve; ≥ 95% observed claims supported) · **diagram validity** (100% nodes/edges resolve) · engagement (chapter-1 and full completion, quiz attempt rate) · perceived value ("how much faster could you find your way around?" + 7-day return) · key-setup completion (signed in → first key added) · share of keys added for OpenRouter · model mix (free vs paid).

## 11. Delivery plan

Walking skeleton by ~week 6 (public URL → job → snapshot → structural graph → one validated outline returned by the API), then deepen. Delivery is sequenced: backend, then product, then landing, then deploy and maintain. Phases and acceptance criteria: [`ROADMAP.md`](./ROADMAP.md).

**Definition of done per phase:** merged behind tests · deployed to staging · visible on the dashboard · runbook/README updated · no open critical threat-model items for that phase.

## 12. Risks (top)

| Risk                                                     | Mitigation                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Weak models cannot produce the richer graph/diagram JSON | Lite path (FR-GEN-4); system-built diagrams first; eval-gated model allow-list; Draft label                            |
| Graph size hurts the workspace                           | Cap nodes per view, layer grouping, lazy rendering, virtualised lists; scope to a sub-directory                        |
| Snapshots go stale (no webhooks)                         | A visible "snapshot from <sha>" label; rerun is one click; lineage shows what changed                                  |
| User API key leaks                                       | Envelope encryption, KEK outside DB, redaction tests, immediate delete — build and test the vault before the first key |
| Small team over-scopes                                   | Walking skeleton first; the plan is sequenced in ROADMAP                                                               |

## 13. Open questions

Which user segment engages most · which diagram types get used · acceptable generation time · ideal course length for medium repos ("first hour" path?) · which providers and models BYOK users pick · whether users finish key setup without a free trial.

## 14. Release-1 acceptance checklist

- [ ] Public URL → finished workspace (graph + diagrams + course) with live SSE progress; crash/retry/cancel proven
- [ ] 100% of course refs and diagram nodes/edges resolve post-validation on every allow-listed model (eval suite)
- [ ] BYOK key never appears in logs or API responses (tests)
- [ ] A job uses only the key it started with; deleting that key fails the job with `KEY_REMOVED` (test)
- [ ] Cross-user access returns 404 (CI)
- [ ] Account deletion cascades keys, repositories, generations, courses, progress and blobs (DB test)
- [ ] Zip-slip/symlink/bomb fixtures rejected
- [ ] Admin routes refuse non-admin sessions before the client shell renders
- [ ] Playwright journey: sign in → import fixture → workspace → lesson → quiz
- [ ] Restore drill completed; alerts fire in staging chaos test
- [ ] Threat-model checklist ([`SECURITY.md`](./SECURITY.md)) signed off
