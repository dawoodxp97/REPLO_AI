# Backend code review (B0–B9)

Reviewed 22 Oct 2026: every non-test source file in `apps/api`, `packages/ai`, `packages/contracts`, `packages/repo-analysis` and `tools/evals` (about 13,300 lines). Test files (about 8,000 lines) were scanned for comments and type escapes, not read line by line.

Baseline before the review: lint, typecheck and tests green. No `any`, no `@ts-ignore`, no TODO or FIXME, no `console` outside CLI entrypoints.

## Already fixed in this pass

Behaviour-preserving. After the changes: lint, typecheck, build and the non-database tests pass (162 API tests ran, 92 skipped for lack of Postgres; the other packages ran in full).

- **Comments:** all 158 code comments removed (JSDoc, section dividers, trailing notes). Source has none left. The one comment-shaped string left is test input in `resolution.test.ts`.
- **Dead code deleted:** `notImplemented`, `containsSecret`, `Pagination`, the unbuilt-stage handlers (`defaultStageHandlers`, `stageNotImplemented`), `DEFAULT_REGISTRY` and `cachedInputUsdPerMTok`, the unused `LIMITS` fields, `SourceIndex.dependencies()`, `sourceRefsOfLesson`, `INDEX_METRICS`, `IndexMetric`, `PROBE_VERSION`.
- **Duplication removed:**
  - three identical error switches in `repositories.router.ts` became two small mappers; the contract's error maps are shared too
  - page-input and `{ ok: true }` schemas shared across contracts
  - job status lists declared once
  - `text(max)` helper and shared lesson header in `drafts.ts`
  - `containsPattern`, `audienceOf`, `WHOLE_JOB`, `sessionUserOf`, `insertChunked`
  - the lite and full branches of `runArchitecture` merged
  - snapshot record types declared once
- **Typing tightened:** `SnapshotFile.language` and `.role` use `Language` and `FileRole`; the job payload uses the contract `Audience`; `generation` no longer re-declares status strings.
- **Small fixes:** `readOptional` no longer blocks the event loop with `existsSync`; a stale integration test that asserted the "unbuilt stage" failure now asserts a generic stage failure.

Not verified: the database suites (no Postgres here). Typecheck covers the code I touched in `generation.repo`, `indexing.repo` and `readOptional`, but run `TEST_DATABASE_URL=… pnpm --filter @replo/api test` before merging.

## Second pass (fake and dead values, typed columns)

- `jobs.get` returns real `budgetUsd` and `spentUsd` instead of a zeroed `estimate`; `error` is `{ code }` only; `stage` is the `Stage` enum. `repositories.preflight` no longer returns an always-empty `estimates` (use `repositories.estimate`).
- Config: `S3_*`, `BACKUP_BUCKET`, `SENTRY_DSN` and `ALERT_WEBHOOK_URL` removed from `config.ts`, `.env.example` and `TECH_STACK.md`; production no longer demands S3 settings. Add them back in O1 when something reads them.
- Migration `0008` drops `job_stages.output_key`, `output_hash`, `started_at`, `llm_calls.cached_input_tokens`, `prompt_hash` and `repo_snapshots.artifact_key`. The `{ outputKey, outputHash }` return type of `StageHandler` is gone. The operator stage list no longer returns an always-null `startedAt`.
- The operator job row now returns `errorMessage` (from `generation_jobs.error_detail`, which was written but never read).
- Columns typed with `$type<…>()`: model preset and custom models, tutorial version audience and status, job kind, stage, audience and error detail, stage and event types, symbol and edge kinds, and the tutorial `generator`. The `pgEnum` lists now come from `as const` tuples exported by contracts (`PROVIDERS`, `JOB_STATUSES`, `VISIBILITIES`, `LESSON_STATUSES`). Casts and re-parses that this made redundant are gone (`models.service`, `audienceOf`, the audience parse in `tutorials.service`). No migration needed for these.
- Not changed: `structuredOutput` on `ModelSpec` (set, never read) and the always-`'ok'` `llm_calls.status`.

## Third pass (services split, cycles removed)

- `TutorialsService` is now `TutorialPublisher` (publish, version for job), `TutorialReader` (readable version, lessons, current version), `TutorialLibrary` (list, summary, overview, chapter, source, counts, recent, search) and `TutorialManager` (visibility, share link, delete, report, repository and account cleanup, push events).
- `GenerationService` is now `JobService` (lifecycle: create, cancel, retry, read, key removal, link tutorial), `JobRuntime` (the worker's `JobStore`, usage sink, reaper) and `JobHistory` (in-flight, recent, latest per repository, operator reads, purge).
- `RepositoriesService` is now `RepositoryLibrary` (list, remove, search, describe, linked ids), `RepositoryImports` (preflight, estimate, import), `RepositoryChanges` (webhook sink) and `RepositorySources` (the ingest lookup).
- The two cycles are gone. Indexing used to need repositories, and tutorials needed learning, both through closures in `composition.ts`. Now indexing depends only on `RepositorySources`, and learning depends only on `TutorialReader`, so `composition.ts` builds every service in dependency order. A scan of the non-test source finds no import cycles.
- `Services` (the router context) now lists only what routers use; `indexing` is no longer in it.

## Fourth pass (query counts)

- `tutorials.list` fetched progress once per row, about six queries each. It now makes three queries in total for a page: the list, the lesson keys of the current versions, and the completed lessons. The batch is `LearningService.completionRatios(userId, targets)`; `overview` and `summary` still use `completionRatio` for one tutorial. `learning.readableOrUndefined` still uses a thrown `NOT_FOUND` as control flow on those single paths.
- `sessionFromRequest` caches the lookup per request, so the rate-limit key and the `/rpc` handler (and the SSE and GitHub setup routes) share one Better Auth call.

## Fifth pass (one outcome type)

- The eight hand-rolled `{ kind: 'ok' | 'refused' }` unions (keys add and validate, preflight resolve and run, plan, estimate, import, tutorial visibility, model preferences) now share `Outcome<T, R>` from `apps/api/src/platform/outcome.ts`, with `ok(value)` and `refused(refusal)` helpers. Success carries `value`; refusal carries `refusal` (an object, usually `{ code }`). Routers read `outcome.value` or map `outcome.refusal` to a contract error.
- Left alone on purpose: `PlanResult` in `packages/ai` (that package cannot import from `apps/api`), and the `{ ok: boolean }` results inside pure code (`resolveEvidence`, `checkDiagram`, `normalizeArchivePath`, `ExtractionGuard.check`).

## Needs a decision (not changed)

The fake or dead values, the untyped columns, the god services and the circular wiring are done; see the passes above. Numbering is kept so earlier references still work.

### Structure (SOLID)

7. **Cross-module table access.** `indexing.repo` reads `repositories`, `generation_jobs` and `tutorial_versions`. `repositories/imports.service` imports `toRepositoryMetadata` from the github module. This breaks the "services only" rule in `RULES.md` §4.
8. **Long functions:** `repositories/imports.service` `plan()` (about 75 lines; an `'unpriced'` sentinel and `?? ''` model ids because `PlanRoles` allows null planner and author), `handleGenerateTutorial` (about 90 lines; compares `e.code === 'CANCELED'` as a string), `groundLesson` (about 190 lines of closures over one mutable ledger), `extractFacts` (about 120 lines), `nextAdapter`, `runValidate`.
9. **Two error classifiers.** `jobs/errors.classifyError` and `ai/budget.isRetryableProviderError` encode the same 429, 5xx and timeout rules.

### Typing the frontend can reuse

11. The same vocabulary is declared three times: contracts (`ModelPreset`, `ModelRole`, `Tier`), `packages/ai` (`PRESETS`, `ROLES`, `TIERS`, `ModelRole`) and the `ai` provider list. `ai` does not import contracts today. Pick one owner. The names `PlanRefusal` and `RunEstimate` also exist in two places with different shapes.
12. Loose contract fields that remain: operator `llmCalls[].stage` and `status`, `NotificationDto.kind`. `llm_calls.status` is always `'ok'`, because failed calls are not recorded. The SSE route builds its payload by hand instead of using `JobEventDto`.

### Performance and robustness

16. The SSE route runs two queries per second per open stream. The comment I removed noted switching to LISTEN/NOTIFY if polling load shows up.
17. `SourceIndex.knownIdentifiers()` reads the text of every file (up to 5,000) during validate.
18. `identity.githubAccessToken` swallows every error and returns `undefined`.

### Remaining duplication

19. Offset cursors (`Number(cursor ?? 0)`, `limit + 1`, `slice`) in dashboard, learning and operator; cursor paging in four services.
20. Repos: `select().from().where().limit(1)` then `[row]` about 25 times; the `userId = … and revokedAt is null` filter six times in `repositories.repo`; `upsertRepository` and `updateMetadata` list the same columns.
21. Three path normalisers (`analysis/paths.normalizePath`, `path-safety.normalizeArchivePath`, `grounding/evidence.normalisePath`) plus a hand-rolled guard in `indexing.service.readText`.
22. Five manifest shapes: `ManifestInfo`, `PackageManifest`, `PackageFile` (analyzer), `PackageJsonFile` (indexing), `PackageManifestJson` (github schemas).
23. `extensionOf` in three files; extension-to-language tables in `filters.ts` and `grammars.ts`.
24. The "collect ref ids from a lesson" walk exists in `tutorials/lesson-content.lessonRefIds`, `grounding/lesson` (`usedRefIds`) and `pipeline/context.draftPaths`. Group-size counting exists in `context.repoMap` and `structure.structuralDiagram`.
25. `tools/evals/fixtures.readRepo` duplicates `repo-analysis/fixtures.test-helpers.loadFixture`; two `mean` helpers.
26. About 140 types and constants are exported but used only in their own file (`*Deps`, `*Outcome`, …). Un-export to shrink the public surface.

## Keeping it clean

The backend ESLint configs enforce "no comments" with `replo/no-comments` (`packages/config/eslint`, D-067). Frontends and `packages/ui` still contain comments and are not covered yet.

## Sixth pass (23 Oct 2026): line-by-line review and fixes

Every non-test source file in `apps/api`, `packages/contracts`, `packages/ai`, `packages/repo-analysis`, `packages/config` and `tools/evals` (about 13,200 lines) was read by a reviewer, one slice each. Each claim was checked against the code before it was fixed. Test files were scanned for comments and not reviewed line by line.

### Applied

- **Comments:** none left in backend source. The rule `replo/no-comments` fails lint on any comment; a probe file confirmed it fires.
- **Shared vocabulary** (import from `@replo/contracts`): `Pipeline`, `Theme`, `NotificationKind`, `CONTENT_SCHEMA_VERSION`. `commitSha` is `CommitSha`; dashboard and job-event `stage` is `Stage`; `localDate` is `z.iso.date()`; `progress` is removed from `JobEventDto` (it was never produced).
- **Bugs fixed (verified):**
  - AI: a settle failure released the budget reservation twice and could retry a billed call (regression test added). Estimates count UTF-8 bytes. Custom models must support structured output on the routed path too. A complete plan was refused by an unneeded fallback.
  - Repo analysis: `..` above the root was clamped to the root. `[[...slug]]` was not a catch-all. The HTML base directory was wrong for `docs/page.html`. A trailing comma before a comment broke tsconfig parsing. The bytes limit ignored CSS, HTML and Python text.
  - Indexing: `package.json` and HTML never reached the analyzer, and the manifest schema dropped `name` and `workspaces`, so workspace resolution never ran. A directory was removed after its rows, so a failed removal could not be retried.
  - Generation and worker: a retry overwrote a pending cancel. `finish` had no status guard. A failed stall send stranded jobs. The SSE terminal flush dropped backlogs. A canceled job no longer emits a retry warning or rethrows.
  - Repositories: import minted a random `Idempotency-Key` when none was sent, so dedupe was off. Preflight counted directories as files in truncated trees. Installation linking raced (now a conditional upsert). List rows were spread into the DTO.
  - Identity and GitHub: the token lookup turned every error into "not linked". The webhook signature accepted trailing junk after 64 hex digits.
  - Grounding: captions, titles, code-span arguments and bare URLs skipped the identifier and sanitising checks. `./` evidence paths never loaded. The hop check accepted same-path edges. The claim total mixed passes.
  - Tutorials, models, operator: unreferenced source refs were dropped, a cursor was returned after an exact full page, drafts reached the recent feed, preferences echoed unrounded input, and the operator cursor came after an exact multiple.
  - Evals: probe scoring ignored the route path. `notMeasured` listed metrics the run did report.
  - Platform: a missing Postgres placeholder bound NULL silently (now throws).
  - Prompts: the `</repo_data>` escape is case-insensitive. All seven prompt hashes are unchanged (checked).
  - Publish: a missing analysis wrote version 0 (now throws `ANALYSIS_MISSING`).
- **Typing and DRY:** casts replaced by guards or `as const`; repeated predicates, column lists and mappers shared; unused exports removed from the `repo-analysis` public surface.

### Behaviour changes to review

- `POST /repositories/import` without `Idempotency-Key` is refused (`IDEMPOTENCY_KEY_REQUIRED`). `apps/product/src/lib/orpc.ts` sends a new key on every request, so it needs a per-attempt key before F1.
- HTML content is kept and served through `readText`, so it now reaches grounding.
- The bytes limit counts all non-binary files, so non-TypeScript repos reach the limit sooner.
- Preflight counts blob entries as files in truncated trees.
- Grounding checks each word of a code span such as `pnpm install`, so more repairs may trigger.

### Decisions for the owner (not changed)

1. `keys.validate` decrypts a stored key in the API process. RULES §0.3 allows decryption only in the worker. Options: run the check as a worker job, or drop `validate` and rely on `add`.
2. `tutorials.getSource` lets link and public viewers read any text file at the pinned commit. FR-LRN-8 asks for the full tree. Confirm that holds for a private repository shared by link.
3. `stages/publish.ts` opens its own DB transaction. Move it behind a publisher call (RULES §4).
4. Money is still float USD on `budgetUsd`, `spentUsd` and `RunEstimate`. The rule is integer micro-USD.
5. `pushedAt` is wall-clock time. Parse `head_commit.timestamp`.
6. Pushes with more than 5,000 changed paths keep only the first 5,000, so the overlap check can miss stale tutorials.
7. Logger redaction covers top-level strings only.
8. `collectPages` stops after 20 pages without a signal.
9. The learning history join needs the tutorials-owned `lesson_index`.
10. Grounding: a fabricated identifier in the title is recorded but the title is kept; a fabricated caption drops its block.
11. Schema: several indexes look unused, `currentVersionId` has no foreign key, and `published_at` is nullable (the `new Date(0)` fallbacks depend on it). Each needs a new migration.
12. Cross-module table reads: indexing reads generation, tutorials and repositories tables; generation joins repository snapshots.
13. Prompt duplication and the retry suffix outside `prompts.ts` would change prompt hashes, so batch them with a prompt version bump.
14. `llm_calls.stage` stays `text` because `packages/ai` types the stage as `string`. Decide whether `ai` takes a stage union.

### Not verified

- The 92 database suites were skipped (no Postgres here). Every SQL change in this pass is untested against Postgres: `repositories.repo.ts` (predicate helpers), `generation.repo.ts` (finish guard, `markWaitingRetry`, `inArray`), `github.repo.ts` (conditional upsert), `tutorials.repo.ts` (published filter, join removal), `operator`, `learning`, `indexing.repo.ts`, `retention`, and the first-lesson source-ref fallback in `publisher.service.ts`.
- Test files were not reviewed line by line.
- `apps/product`, `apps/landing` and `packages/ui` still contain comments; the lint rule does not cover them yet.
