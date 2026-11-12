# How generation works

This page follows one tutorial from the moment a user clicks Generate to the moment the browser shows it as published. Paths are under `apps/api/src`. For the overall shape of the system see [`ARCHITECTURE.md`](../ARCHITECTURE.md); for the tables see [`DATABASE.md`](./DATABASE.md).

Two processes take part. The HTTP process (`main.http.ts`) accepts the request, writes the job and streams progress. The worker process (`main.worker.ts`) does the work. They share nothing but Postgres: `generation_jobs` is the durable record of every run, and pg-boss (also in Postgres) only delivers "please run job X" messages, at least once.

## 1. The request

The product calls `repositories.import` with an `Idempotency-Key` header. `modules/repositories/repositories.router.ts` refuses a request without one, then calls `importRepository` in `modules/repositories/imports.service.ts`.

`importRepository` first looks for a job with the same key (`jobs.findByIdempotencyKey`); a retried request gets the existing job back. Otherwise it plans the run: it loads the user's key, picks models, runs the GitHub pre-flight (`modules/repositories/preflight.ts`: resolve the ref to a commit, list the tree, refuse repos that are too large), prices the plan and refuses it if the estimate exceeds the budget. It then re-checks the key with the provider through `keys.validate` (`modules/keys/keys.service.ts`). This is the one place the HTTP process decrypts a key, in memory, for that check only.

Then one transaction does all the writes: upsert `repositories`, link `user_repositories`, create or reuse a `repository_snapshots` row for the commit (`indexing.ensureSnapshot`), and call `createJob` in `modules/jobs/jobs.service.ts`. `createJob` inserts the `generation_jobs` row (status `queued`), adds a `queued` row to `job_events`, and sends the pg-boss message through the same transaction (`enqueueTutorial`), so the job and its message commit together or not at all. If two requests with the same key race, the unique index on `(user_id, idempotency_key)` makes the second insert a no-op and it returns the first job.

The response is the job DTO (`toDto`). The browser now opens the progress stream.

## 2. Progress to the browser

`GET /jobs/:id/events` is `registerJobEventsRoute` in `modules/jobs/job-events.route.ts`. It answers 404 unless the signed-in user owns the job. It then polls `job_events` about once a second and writes each new row as a server-sent event whose `id` is the row id. When the browser reconnects it sends `Last-Event-ID`, and the route replays every row after it. The stream ends when the job was already finished at connect, or when the last event it sent is `succeeded`, `failed` or `canceled`.

Everything the worker reports therefore goes through `job_events`; the browser never reads `generation_jobs` directly while streaming.

## 3. The worker picks it up

`main.worker.ts` registers `handleGenerateTutorial` (`worker/generate-tutorial.ts`) on the `generate-tutorial` queue. Queue names, the payload schema, per-stage timeouts, progress percentages and `MAX_ATTEMPTS` live in `worker/job-payload.ts`, which also declares the queues (`declareQueues`).

The handler parses the payload and calls `jobStore.claim` (`modules/jobs/job-runtime.service.ts`, backed by `jobsRepo` in `modules/jobs/jobs.repo.ts`). Claim is one conditional `UPDATE`: only a `queued`, `waiting_retry` or `stalled` job becomes `running`, and `attempts` goes up by one. A duplicate delivery claims nothing and returns.

While the job runs, a heartbeat every 15 seconds updates `heartbeat_at` and reads the status back. `canceling` aborts the run as a cancel; a row that is no longer running at all (for example the key was deleted) aborts it as "stopped", and the worker then writes nothing.

## 4. The stages

The handler walks `STAGES` in order: `ingest, index, summaries, architecture, outline, lessons, validate, publish`. For each stage it skips it if `job_stages` already has it `completed`, sets `generation_jobs.stage`, emits `stage_started`, runs the stage handler under `withTimeout` (`worker/with-timeout.ts`), then marks the stage completed in `job_stages`, sets `progress` and emits `stage_completed`.

The handlers come from `createPipelineService` in `modules/pipeline/pipeline.service.ts`:

- **ingest / index**: `IndexingService.ingest` and `index` (`modules/indexing/indexing.service.ts`) download one tarball for the commit, extract it safely to the snapshot directory, and store the static index in `snapshot_files`, `snapshot_symbols`, `snapshot_file_edges` and `repository_snapshots.analysis`. Repo code is never run.
- **summaries**: `runSummaries` (`stages/summaries.ts`) summarises the most central files, with the summarizer model or from exported symbols when the plan has none.
- **architecture, outline**: `runArchitecture` and `runOutline` (`stages/planning.ts`) ask the planner model. The lite pipeline makes one call that writes both.
- **lessons**: `runLessons` (`stages/lessons.ts`) asks the author model for each chapter's lessons and quiz.
- **validate**: `runValidate` (`stages/validate.ts`) grounds every lesson (`stages/ground-chapters.ts` with the pure checks in `grounding/`), allows one repair call per failing lesson, optionally asks the judge model per chapter, and assembles the final `TutorialContent` with its validation report (`stages/assemble-content.ts`). The model only points at files and symbols; the system inserts the quoted code.
- **publish**: `runPublish` (`stages/publish.ts`), described in step 6.

Shared helpers for stages are in `modules/pipeline/stage-tools.ts`; the text that goes into prompts (repo map, excerpts, focus paths) is built in `modules/pipeline/prompt-inputs.ts`.

## 5. Model calls, money and checkpoints

Stages call models only through `openLlm` (`modules/pipeline/llm.ts`). It asks `keys.openForJob` to decrypt the user's key in the worker's memory and builds the client with `modelFor`. Every call goes through the job's `Budget` (created in `main.worker.ts`): it reserves before the call and settles after, and the usage sink (`usageSink` in `job-runtime.service.ts`) writes a `job_llm_calls` row and adds the cost to `generation_jobs.spent_micros` in one transaction.

Every paid result is saved before the stage moves on. `checkpointed` in `stage-tools.ts` first reads `job_checkpoints` for `(job, stage, checkpoint key)` and only calls the model when nothing is stored. Keys are `all` for whole-stage results, the chapter key for lessons, and `lesson:<key>`, `overview` and `judge:<chapterKey>` for validate; the store is `createCheckpoints` in `modules/pipeline/checkpoints.ts`. A retried or resumed job therefore never pays twice for the same piece.

## 6. Publish

`runPublish` reads the validated content from the `validate` checkpoint and opens one transaction. Inside it, `jobs.fenceRunning` locks the `generation_jobs` row and throws unless the job is still `running` with the same attempt number, so a canceled or superseded attempt cannot publish. `TutorialPublisher.publishVersion` (`modules/tutorials/publisher.service.ts`) creates the `tutorials` row on the first run for that repository, inserts a `tutorial_versions` row (`draft` or `published`, from the report) with the content, report and generator metadata, and fills `tutorial_source_refs` and `tutorial_lessons`. `jobs.linkTutorial` stores the tutorial id on the job. After the commit, the job's checkpoints are deleted.

`tutorial_versions.generation_job_id` is unique. If the worker dies after the commit, the redelivered job finds the version already there (`versionForJob`) and only cleans up.

## 7. The end

When the last stage completes, the handler calls `jobStore.finish(jobId, 'succeeded')`. `endJob` (`modules/jobs/job-ending.ts`) moves the row to its terminal status only if it is still in flight, and in the same transaction `announceJobEnd` writes the terminal `job_events` row and a `notifications` row. The SSE route sends that `succeeded` event and closes the stream.

From here on the job DTO from `jobs.get` carries the tutorial id and link. The tutorial itself is read through `tutorials.get`, `getChapter` and `getSource`, served by `modules/tutorials/content.service.ts`; who may read which version is decided in `modules/tutorials/version-access.service.ts` and `access.ts`, which answer 404 rather than 403 to anyone who may not.

## Where things are stored

`generation_jobs` holds the run itself: status, current stage, progress, attempts, heartbeat, budget and spend, error code, and the tutorial it produced. `job_stages` records which stages completed, which is what lets a resumed run skip them. `job_checkpoints` holds the paid intermediate results until publish succeeds. `job_events` is the append-only progress log the browser replays. `job_llm_calls` has one row per model call with tokens, cost and latency, never the prompt or the answer. The snapshot tables hold the repository's index for one commit and can be shared by several jobs. The published result lives in `tutorials`, `tutorial_versions`, `tutorial_source_refs` and `tutorial_lessons`; `notifications` tells the user how the run ended.

## Cancel, retry and crashes

**Cancel.** `jobs.cancel` (`jobs.service.ts`) flips a `running` job to `canceling`; the worker sees it on its next heartbeat, aborts the stage and finishes the job as `canceled`. A job with no worker (`queued`, `waiting_retry`, `stalled`) is set to `canceled` directly, with its event and notification.

**Automatic retry.** Errors are classified in `worker/errors.ts`. A retryable one (timeouts, 429/5xx, network) with attempts left moves the job to `waiting_retry` (`markWaitingRetry`), emits a `warning`, and rethrows so pg-boss redelivers with backoff. Completed stages and checkpoints stay, so the next attempt resumes. A non-retryable error, or the last attempt, ends the job as `failed` with an error code; provider text is never stored. If the user canceled while the stage was failing, the job ends as `canceled` instead.

**Manual retry.** `jobs.retry` resets a `failed` or `canceled` job to `queued` with `attempts = 0`, emits `queued` and enqueues it again in one transaction. Checkpoints of failed and canceled jobs are kept for 30 days (`modules/retention/retention.service.ts`), so a retry inside that window resumes.

**Worker crash.** Nothing marks the job as dead at the moment of the crash. Every minute the worker runs `requeueStalled` (`job-runtime.service.ts`): `running` jobs whose heartbeat is older than two minutes become `stalled`, and every stalled job is sent to the queue again. Claim accepts `stalled`, the attempt number moves on, finished stages are skipped and checkpoints are reused. If the old worker is in fact still alive, a heartbeat that finds the job `stalled` stops it, and the publish fence rejects its old attempt number.

**Key deletion.** `keys.delete` fails every in-flight job on that key in the same transaction as the delete (`jobs.failForKey`). Running workers see "stopped" on their next heartbeat and exit without writing a status.
