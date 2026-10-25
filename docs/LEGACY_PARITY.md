# Legacy feature parity plan

Status: **approved 2026-10-22**; decisions applied in PRD v0.3, ADR-008 and MEM D-016 to D-027 · Date: 2026-10-22 · Owner: @Dawood

This maps every feature of the legacy app (`OLD_LEGACY_REPLO/replo-hq-main`: FastAPI + ARQ + Next.js 16) onto the new product. It is a reference for **features, pages and flows only**. No legacy code is reused. Where the legacy design was wrong, the new stack already fixes it (see [`docs/REWRITE_PLAN.md`](../OLD_LEGACY_REPLO/replo-hq-main/docs/REWRITE_PLAN.md) and the legacy `apps/api/app/*/CLAUDE.md` notes).

[`PRD.md`](../PRD.md) is the build contract and changes only through a deliberate edit plus a `MEM.md` entry. Section 4 lists the decisions, now approved and applied.

## 1. Legend

| Mark | Meaning |
| --- | --- |
| ✅ | Already in the PRD (requirement ID given) |
| ➕ | Compatible with the PRD and its rules, but **missing**. Add a requirement |
| ❓ | Needs your decision. Conflicts with a non-goal, a hard rule, or is out of scope |
| ❌ | Drop. ADR-007 forbids it, or a newer decision supersedes it |

## 2. Feature inventory

### 2.1 Accounts and access

| Legacy feature (where) | Mark | New treatment |
| --- | --- | --- |
| Email + password signup, login, refresh tokens, `me` (`routers/user.py`) | ❌ | GitHub sign-in only (FR-AUTH-1, D10a). Sessions via Better Auth |
| Revoke all sessions (`settings/security`) | ➕ | **FR-AUTH-4**: sign out every other session. Better Auth supports this directly |
| Change password (`settings/security/password`) | ❌ | No passwords exist in the new product |
| Delete account, password-confirmed (`settings/security/delete-account`) | ✅ | FR-AUTH-3. Confirm with a GitHub re-auth instead of a password |
| Route guards and `next=` return URL (`middleware.ts`) | ➕ | Frontend UX only. The backend stays the authority (D4). Add to the product route shells |

### 2.2 Profile, appearance, learning and notification preferences

Legacy shape: a `user_settings` row, five settings tabs (Profile, Appearance, Learning, Notifications, Security).

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Profile: bio, location, website, avatar, connected accounts | ❓ | Name and avatar come from GitHub. Drop bio, location, website and "connected accounts" (Q8) |
| Theme (light / dark) | ➕ | **FR-SET-1**. Both themes are already required by NFR-A11Y-1 |
| UI language | ❓ | Defer. PRD §13 lists "second language demand" as an open question (Q8) |
| Code editor theme | ❌ | There is no editor. Shiki follows the app theme |
| Default difficulty | ➕ | Default **audience level** for new imports (FR-GEN-6) |
| Auto-play next module | ➕ | Auto-advance to the next lesson (FR-LRN-4 navigation) |
| Quiz mode on/off | ➕ | Quizzes can be skipped (FR-SET-1). Quizzes stay on by default |
| "Show code hints" | ❌ | Legacy meaning unclear, no spec. Drop unless you can name the hint |
| Daily learning goal (minutes or modules) | ❓ | Needs time-on-lesson tracking the PRD does not define (Q3) |
| Notifications: email, weekly digest, "new features", tutorial completions, browser | ❓ | In-app and browser only in R1. Email and digests need a provider the PRD does not have (Q4) |

### 2.3 Notifications

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Notification rows (title, message, type, link, read state) written when a generation finishes (`services/notifications.py`) | ➕ | **FR-NTF-1**. The worker writes an in-app notification on `succeeded` / `failed` / `canceled`. The SSE stream carries unread count |
| List, unread count, mark one read, mark all read, delete | ➕ | Same FR-NTF-1 procedures. Pagination per NFR-PERF |
| Outbound webhook on completion (`AI_LAYER_PLAN` nice-to-have) | ❓ | Not in R1. Revisit with the API integration story |

### 2.4 Dashboard and progress

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Tutorial status counts (completed / in progress / not started / processing) | ➕ | **FR-DASH-1**: "Home" with library summary, jobs in flight, and resume |
| Current streak, learning hours this week, weekly activity heatmap (tz-aware via `?tz=`) | ❓ | Needs a time metric and a streak definition the PRD does not have (Q3). If adopted, copy the legacy rule: caller-timezone bucketing, all date maths in Postgres |
| Recent activity feed | ➕ | Part of FR-DASH-1, read from `learning_progress` and job events |
| Progress overview and per-tutorial summaries | ✅ | FR-LRN-6 covers resume and per-version progress. Add an overview page (ROADMAP P7 already names "progress") |
| Mark module complete / **unmark** (`progress/complete_module`, `DELETE progress/modules/{id}`) | ✅ / ➕ | `learning.markLesson` exists. Add **unmark** to the contract |
| Quiz submit with grading, attempts stored (`progress/submit_quiz`) | ✅ | FR-LRN-5, `learning.submitQuiz`, `quiz_attempts` |
| Paginated module-progress history (`progress/modules`) | ➕ | Add to the progress overview (FR-DASH-1) |

### 2.5 Search

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Substring search over the caller's own tutorials, repos and modules, trigram-indexed (`services/search.py`, pg_trgm) | ➕ | **FR-SRCH-1**. Own library only. Use `pg_trgm` on Postgres 17 (the legacy `pg_trgm` migration is the pattern to follow). Public search is not in legacy and not in the PRD |

### 2.6 Repository library and source browsing

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Add a repo by URL (`routers/repo.py POST`) | ✅ | FR-IMP-1 (public), FR-IMP-2 (private via GitHub App) |
| List repos, paginated, with status | ➕ | **FR-LIB-1**: "My repositories" backed by `user_repositories` (PRD §7). Status comes from the job state machine |
| Repo detail (name, description, status) | ✅ | Repo page inside the library |
| Read-only file tree and file content (`/tree`, `/file`) | ✅ / ➕ | FR-LRN-8 shows "cited files + tree". Legacy shows **any** file. Widen FR-LRN-8 to any text file at the pinned SHA, ≤ 1 MB (FR-IMP-6) |
| Delete a repo, which cascades to its tutorials (`DELETE /repo/{id}`) | ➕ | **FR-LIB-2**: remove from library. Deletes this user's tutorials and progress for it. Public tutorials follow the FR-AUTH-3 choice |
| Clone with `git clone --depth 1`, allowlist, 500 MB cap, symlink refusal (`utils/repo_utils.py`) | ✅ (replaced) | FR-IMP-5 downloads a **tarball per SHA** with stricter extraction rules. Git is not used |

### 2.7 Generation

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Generate from a repo URL (`POST /tutorial/generate`, 202) | ✅ | `repositories.import`, FR-IMP-1 |
| Target difficulty: beginner / intermediate / advanced | ✅ (renamed) | FR-GEN-6 audience levels: newcomer / intermediate / expert. Keep the PRD names; this is naming only, no decision needed |
| Focus areas (multi-select) and additional free-text context | ❓ | FR-GEN-9 (custom learning goal) is **V**. Free text is untrusted input, so it goes in a labelled data section (RULES §6). Keep V (Q9) |
| Generation status by instance, and by repo URL (`/generation/status`, `/{id}/status`) | ✅ / ➕ | `jobs.get` plus the SSE stream. Lookup by repo URL is a convenience. Optional |
| Result fetch (`/{id}/result`) | ✅ | `tutorials.get` |
| Cancel a running job | ✅ | `jobs.cancel` (PRD §8) |
| **Retry** a failed generation (`POST /tutorial/{id}/retry`) | ➕ | **FR-GEN-11** and `jobs.retry`. PRD §8 has no retry procedure. Retry resumes from the last checkpoint (FR-GEN-2), it does not restart |
| Adaptive difficulty based on progress (landing copy) | ❓ | Not in the PRD. Recommend drop (Q10) |

### 2.8 Tutorial reading (the player)

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Overview with architecture diagram, outline, version info | ✅ | FR-LRN-7 |
| Module pages: markdown, `file_path`, `code_snippet`, Mermaid diagram | ✅ | FR-LRN-3 block types. Every prose block is grounded (FR-GRD-1). Legacy text was **not** grounded |
| Outline sidebar, previous / next module, progress bar | ✅ | FR-LRN-1 and FR-LRN-4 |
| Pinned source panel, cited ranges, "Open on GitHub" permalink | ✅ | Not in legacy. The PRD's core differentiator (FR-LRN-1, FR-LRN-2) |
| **Runnable code sandbox** (Sandpack editor + preview, `CodeSandbox.tsx`) | ❓ | **Conflicts** with FR-LRN-10 ("highlight only"), the non-goal "executing repo code in any sandbox", and RULES §0.1. Recommend no execution in R1. Any future execution is a separate ADR (ADR-005) (Q1) |
| Quiz: multiple choice and true / false, instant grading, explanations (`QuizComponent.tsx`) | ✅ / ❓ | Multiple choice is FR-LRN-5. True / false is a question type the PRD does not have (Q7) |
| Quiz answer key never sent to learners | ✅ (carry over) | Keep the allow-list rule from the legacy routers notes. The key is returned only after an attempt |
| Keyboard navigation, command palette | ✅ | FR-LRN-4 |
| Mermaid diagrams (`DiagramViewer`) | ✅ | FR-LRN-7, `securityLevel: strict` |

### 2.9 Authoring (manual tutorial editing)

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Edit tutorial title / level (`PATCH /author/tutorials/{id}`) | ❓ | Non-goal: manual tutorial editing (Q2) |
| Create, edit, delete, reorder modules (`/author/.../modules`) | ❓ | Non-goal (Q2). Hand-written prose cannot pass FR-GRD-1 without the same validator |
| Upsert, delete quiz per module (`/author/modules/{id}/quiz`) | ❓ | Non-goal (Q2) |
| Author UI (`ModuleEditor`, `QuizEditor`, `InteractiveEditor`) | ❓ | Not ported with Q2 |
| **Visibility change** (`PATCH /tutorial/{id}/visibility`) | ✅ | FR-SHR-1. The only writer of visibility and slug |

Why Q2 matters: the legacy author endpoints write prose and quiz answers that no validator checks. In the new product, an author-written claim would have to be labelled `interpretation` (FR-GRD-1). That undercuts the core promise.

### 2.10 Tutorial library, visibility and sharing

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| My tutorials list, paginated, filter by status (`/tutorial`) | ➕ | **FR-LIB-1** (see 2.6) |
| Delete a tutorial (`DELETE /tutorial/{id}`) | ➕ | **FR-LIB-3**: owner-only. Removes its progress and quiz attempts. Ships with tests (NFR-SEC-1) |
| Visibility: private / public / unlisted | ✅ | FR-SHR-1 maps `private → link → public`. "Unlisted" is the link tier |
| Stable slug per tutorial, assigned on first publish, never changed | ➕ | **FR-SHR-5**. The legacy `slug` rule is the right one. Adopt it |
| Public tutorial readable without login | ✅ | FR-SHR-2. Plus the OSI-licence gate (FR-SHR-3), which legacy did not have |
| Public tutorial page (read-only, server-rendered) | ✅ | FR-SHR-2 (includes OG images, which legacy did not verifiably have) |

### 2.11 BYOK keys and models

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Store, list, validate, delete a key (`settings/credentials`) | ✅ | FR-RUN-3. `keys.list / add / validate / delete` |
| Providers: OpenRouter, OpenAI, Anthropic, **custom OpenAI-compatible `base_url`** | ❓ | The custom endpoint **violates** RULES §4 (users never supply endpoints; SSRF). Recommend drop (Q5). The PRD adds **Google AI Studio**, which legacy did not have |
| Plaintext `provider`, `label`, `last_four` for the UI | ✅ | FR-RUN-3, shown as `…last4` |

### 2.12 Billing and monetisation

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Credit balances, append-only credit ledger, signup grant, generation debit (`models/billing.py`) | ❌ | ADR-007. **Do not** port the tables. The new schema has no billing |
| Billing customers, subscriptions (Stripe status enum) | ❌ | ADR-007 |
| Five free platform-funded generations | ❌ | ADR-007. The platform funds no AI |

### 2.13 Marketing site and public pages

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| Landing: nav, hero, features grid, demo split, CTA, footer | ✅ | `apps/landing`, static export (ARCHITECTURE §1). The features copy must be rewritten to match the PRD. Remove "adaptive" and "live execution" claims |
| Testimonials (three named people at named companies) | ❌ | **Do not port.** Nothing shows these people exist or consented. Use real, consented quotes after beta only |
| Newsletter subscribe (`app/api/subscribe`, a **mock** that stores nothing) | ❓ | Needs an email provider the PRD does not have. Drop for R1 (Q4) |
| Demo input page (`(public)/demo/input`) | ❌ | A component showcase. Belongs in `packages/ui` docs |
| Login and signup pages | ✅ | GitHub sign-in button only |

### 2.14 Platform and operations

| Legacy feature | Mark | New treatment |
| --- | --- | --- |
| `/api/health` (liveness) and `/api/ready` (DB and Redis checks) | ✅ | `GET /healthz` and `GET /readyz` (PRD §8). Readiness checks Postgres only, since Redis is gone (ADR-002) |
| Request-ID middleware, `X-Request-ID` header | ➕ | **NFR-OBS-2**: request id on every log line and error body |
| Secret-redaction log filter | ✅ | NFR-SEC-3 and NFR-OBS-1 |
| Rate limiting (planned in legacy, never built) | ➕ | **NFR-SEC-7**: rate limits on auth, import and key validation |
| Redis + ARQ | ❌ (replaced) | pg-boss on Postgres (ADR-002) |
| k6 load script (`tests/load`) | ➕ | Optional, post-beta. The evals harness covers grounding and cost |
| Lighthouse CI config | ✅ | NFR-A11Y-1 (Lighthouse a11y ≥ 90 on the player) |
| Docker Compose: Postgres, Redis, API, worker, web | ✅ (changed) | Postgres 17 and MinIO. No Redis (ADR-002) |

## 3. AI orchestration: legacy to new

The legacy design is a good shape with broken parts. The new design keeps the shape and fixes the parts. Legacy source: `apps/api/app/orchestrator/`, `apps/api/app/steps/`, `AI_LAYER_PLAN.md`.

| Legacy piece | Problem found in legacy | New design |
| --- | --- | --- |
| `TutorialOrchestrator.execute()` merges every step's dict into one growing context | No typed contract. A renamed LLM key becomes `None` downstream. Context grows and gets written in plaintext | Typed Zod contract per stage (FR-GEN-1). Stages persist their own output, not one shared blob |
| First failure aborts. `current_step_order` is written and never read | No resume, no retry | Checkpointed stages in `job_stages`, idempotent, resume from the last completed stage (FR-GEN-2, NFR-REL-1) |
| `get_steps()` hard-codes the list and `create_step_instance` is an if/elif ladder | Two places to edit per step | Typed step registry (REWRITE_PLAN 3.2) |
| Prompts live in two places: DB rows and Python strings, switched by the sentinel `"Default prompt"` | Unversioned. Edits change output with no record | Prompts are **versioned in code**. Version and hash stored per tutorial version (RULES §6, FR-GRD-5). See Q6 |
| `str.format()` on templates | Any `{` in repo code raises `KeyError` | Labelled data sections, no format strings |
| Analysis reads the **top 5 files at 2,000 characters** | The evidence base for a whole-repo tutorial is tiny | Stages 1–4: ingest, index (tree-sitter WASM, symbols, import graph), summaries, architecture (P3) |
| Outline, then content, then a "refine" polish pass with no checks | Polish without verification reintroduces unverified claims | Stage 5 outline, stage 6 context pack, 7 lessons and quizzes, 8 diagrams, **9 validate and repair** (FR-GRD-2, ≤ 1 repair per lesson, FR-GEN-3) |
| `save_tutorial` commits **per module** | A mid-loop failure leaves a half-written tutorial | Stage 10 publishes one immutable `tutorial_version` in one transaction |
| Quizzes are never generated (`# Future: Generate quizzes…`) | Quiz UI with nothing behind it | Stage 7 generates 3–5 questions per chapter, each with a source reference (FR-LRN-5) |
| Level hard-coded to `INTERMEDIATE`; the user's choice is discarded | Input ignored | Audience level is a pipeline input (FR-GEN-6) |
| Hard-coded free model `kwaipilot/kat-coder-pro:free` in three places | Free tiers vanish; the platform should not pick models | Presets over the user's own keys. Models are config, not code (FR-RUN-5, ADR-007) |
| `git clone` of user-supplied URLs. Limits were added late, in one slice (`utils/repo_utils.py`) | Clone path was unbounded and had an SSRF surface until then | Tarball per pinned SHA, allow-listed host, caps, safe extraction (FR-IMP-5, FR-IMP-6) |
| `tree-sitter` and `transformers` (CodeBERT) listed, never imported | About 2 GB of unused image | Drop CodeBERT and embeddings (non-goal, ADR-003). tree-sitter WASM only, in `packages/repo-analysis` |
| Repo analysis cache (AI_LAYER_PLAN nice-to-have) | Not built | Keep as a cache keyed by `(commit SHA, analyzer_version)`. **Public repos only** shared across users. Private analysis stays per user (NFR-SEC-6) |
| Streaming LLM responses (nice-to-have) | Not built | Not needed. SSE streams **job progress**, not tokens |
| Incremental regeneration, A/B prompt testing | Not built | Incremental regeneration is a non-goal. A/B comparison is what `tools/evals` is for |
| Cost tracking per tutorial (nice-to-have) | Not built | FR-RUN-13: `llm_calls` with provider-reported tokens and cost |

## 4. Decisions (approved 2026-10-22)

All ten were approved as recommended. The MEM entries are: Q1 D-017, Q2 D-026, Q3 D-018, Q4 D-019, Q5 D-020, Q6 D-021, Q7 D-022, Q8 D-023, Q9 D-024, Q10 D-025.

| # | Question | Recommendation |
| --- | --- | --- |
| Q1 | Runnable code sandbox (Sandpack) in the player? | **No.** Highlight only (FR-LRN-10), per RULES §0.1. Revisit with its own ADR if wanted |
| Q2 | Manual authoring: edit modules, quizzes, titles? | **No** in R1. It is a non-goal, and hand-written claims bypass grounding |
| Q3 | Dashboard streak, heatmap, learning hours, daily goal? | **Lean dashboard now** (counts, resume, activity). Streaks later, once a time metric exists |
| Q4 | Email: completion emails, weekly digest, newsletter? | **None in R1.** In-app plus browser notifications. Closes PRD §13 "email notification?" |
| Q5 | Custom OpenAI-compatible endpoint in BYOK? | **Drop.** RULES §4 forbids user-supplied endpoints |
| Q6 | Prompts editable in the database (AI_LAYER_PLAN) or versioned in code? | **Versioned in code**, with hashes stored. Otherwise FR-GRD-5 reproducibility fails |
| Q7 | Add true / false quiz questions? | **Yes, optional.** Same grader, low cost. Changes FR-LRN-5 wording |
| Q8 | Profile fields (bio, location, website), and UI language? | **Drop** the profile fields. **Defer** i18n |
| Q9 | Pull FR-GEN-9 (focus areas and free-text goal) into R1? | **Keep V.** If pulled forward, free text is data, never instructions |
| Q10 | Adaptive difficulty? | **Drop.** It needs a model of the learner the PRD does not have |

## 5. PRD and API additions (applied)

**New requirement IDs** (IDs are stable and never reused):

- FR-AUTH-4: sign out all other sessions
- FR-SET-1: preferences (theme, default audience level, auto-advance, quizzes on or off)
- FR-LIB-1: My repositories and My tutorials, paginated, with status
- FR-LIB-2: remove a repo from the library (cascades to this user's tutorials and progress)
- FR-LIB-3: delete a tutorial (owner only, cascades progress and attempts)
- FR-LRN-12: progress overview and unmark a lesson
- FR-SRCH-1: search own library (`pg_trgm`)
- FR-NTF-1: in-app notifications on job finish
- FR-DASH-1: home dashboard (counts, resume, jobs in flight, recent activity)
- FR-GEN-11: retry a failed job from its last checkpoint
- FR-SHR-5: stable slug per tutorial, assigned on first publish
- NFR-OBS-2: request id on every log line and error body
- NFR-SEC-7: rate limits on auth, import and key validation

**API procedures to add to PRD §8 and `docs/API.md`:** `jobs.retry`, `learning.unmarkLesson`, `tutorials.delete`, `repositories.list`, `repositories.remove`, `search.own`, `notifications.{list,unreadCount,markRead,markAllRead,delete}`, `dashboard.{summary,recent}`, `settings.{get,update}`, `auth.revokeOtherSessions`.

**Changed:** FR-LRN-8 (source explorer shows any text file at the pinned SHA, ≤ 1 MB). FR-GEN-6 (level names as in the PRD). FR-LRN-5 (true / false, only if Q7 is yes).

**Stale text found in the new docs, to fix either way:**

- `ROADMAP.md` P9 says "house ads". ADR-007 and RULES §0.7 say no ads, ever. This is a bug in the roadmap.

## 6. What I did not verify

- I read the legacy routers, models, services and page components by file and name. I did not run the legacy app or its database, so behaviour claims come from code, not from runtime.
- I did not verify whether legacy shipped ads or analytics. Nothing in this document depends on that.
- No application code changed. Docs only.
- Applied: PRD v0.3, ADR-008, MEM D-016 to D-027, `docs/API.md`, `docs/DATABASE.md`, ROADMAP.
