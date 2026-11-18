# API.md

> Target: [`PRD.md`](../PRD.md) §8. Rewritten in R2 to match the implemented surface.

The API is **contract-first**: [`packages/contracts`](../packages/contracts/src) defines every input, output and typed error with Zod 4 + oRPC; [`apps/api`](../apps/api/src) implements it (`implement(contract)`); `apps/product` imports only the contract **type** (`ContractRouterClient<typeof contract>`).

## Conventions

- RPC base path: `/rpc` (oRPC RPC protocol).
- Auth: opaque session token in the `replo_session` cookie (httpOnly, Secure in production, SameSite=Lax, 30 days). The database holds only its SHA-256. Missing session → `UNAUTHORIZED` (401).
- Password refusals: `auth.signIn` → `INVALID_CREDENTIALS` (401); `auth.signUp` → `EMAIL_TAKEN` (409). Neither issues a session.
- State-changing requests: `Origin` must equal `PRODUCT_ORIGIN` (else 403 `BAD_ORIGIN`).
- Idempotency: clients send an `Idempotency-Key` header; a unique `(user_id, idempotency_key)` returns the existing job. `repositories.import` requires it (`IDEMPOTENCY_KEY_REQUIRED`).
- **Foreign IDs return 404, never 403.** Every private read is user-scoped; the row and the id are looked up together.
- Paged outputs share `pageOutput(item, cursor)` → `{ items, nextCursor }`; date buckets take an IANA `tz` and are computed in Postgres.
- Rate limits apply to sign-in, import, key validation and the gated read procedures; 429 responses carry `Retry-After`.
- Every JSON error body carries `requestId`; every response echoes `X-Request-ID`.

## Procedures (release 1)

### auth (public)

| Procedure        | Method / path         | Purpose                                                                                      |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `auth.providers` | GET `/auth/providers` | Which optional providers are configured: `{ google, github }`                                |
| `auth.signUp`    | POST `/auth/sign-up`  | Name, email, password (min 8). Creates the account and sets the session. `EMAIL_TAKEN` (409) |
| `auth.signIn`    | POST `/auth/sign-in`  | Email and password; sets the session. `INVALID_CREDENTIALS` (401)                            |
| `auth.signOut`   | POST `/auth/sign-out` | Deletes the current session and clears the cookie                                            |

There is **no** revoke-other-sessions procedure.

### me / github / keys / models

| Procedure               | Method / path                 | Auth | Purpose                                                                             |
| ----------------------- | ----------------------------- | ---- | ----------------------------------------------------------------------------------- |
| `me.get`                | GET `/me`                     | User | Profile plus `signInMethods: { password, google, github }`                          |
| `me.deleteAccount`      | POST `/me/delete`             | User | Deletes the account and every row it owns; `confirm: "DELETE"`                      |
| `github.installUrl`     | GET `/github/install-url`     | User | GitHub App install URL (`{ url }`, null when no App slug)                           |
| `github.listRepos`      | GET `/github/repos`           | User | Repos the caller's installations can read; `GITHUB_RELINK_REQUIRED`                 |
| `keys.list`             | GET `/keys`                   | User | BYOK keys; responses show only `…last4`                                             |
| `keys.add`              | POST `/keys`                  | User | Validates then stores; `KEY_INVALID`, `KEY_ALREADY_EXISTS`, `KEY_CHECK_UNAVAILABLE` |
| `keys.validate`         | POST `/keys/{keyId}/validate` | User | Re-checks one key; `KEY_CHECK_UNAVAILABLE`                                          |
| `keys.delete`           | DELETE `/keys/{keyId}`        | User | Deletes the key; jobs still running on it fail with `KEY_REMOVED`                   |
| `models.catalog`        | GET `/models/catalog`         | User | Catalogue plus `freeAllowList`                                                      |
| `models.getPreferences` | GET `/models/preferences`     | User | `{ defaultModel }`                                                                  |
| `models.setPreferences` | PUT `/models/preferences`     | User | Sets the default model; `MODEL_NOT_ALLOWED { modelId }`                             |

Keys are vault-only: the API returns `…last4` and never the secret, and no endpoint exposes a prompt.

### repositories / jobs

| Procedure                | Method / path                             | Auth      | Purpose                                                                                                                      |
| ------------------------ | ----------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `repositories.preflight` | POST `/repositories/preflight`            | User      | Size/language check via the Git Trees API; `REPO_TOO_LARGE`, `REPO_NOT_ACCESSIBLE`, `UNSUPPORTED_LANGUAGE`                   |
| `repositories.import`    | POST `/repositories/import`               | User      | Create a job on one of the caller's keys; needs `Idempotency-Key`; rate limited                                              |
| `repositories.list`      | GET `/repositories`                       | User      | Linked repositories, cursor-paged, with latest job state, course/generation counts and last activity                         |
| `repositories.remove`    | DELETE `/repositories/{repositoryId}`     | User      | Unlinks the repository and deletes the caller's courses and progress for it                                                  |
| `repositories.rerun`     | POST `/repositories/{repositoryId}/rerun` | User      | Fresh snapshot + new job on the caller's key; `KEY_INVALID`, `KEY_CHECK_UNAVAILABLE`, `MODEL_NOT_ALLOWED`, repo refusals     |
| `jobs.get`               | GET `/jobs/{jobId}`                       | Job owner | Status, stage, progress, `createdAt` (elapsed time), repository, commit, course link                                         |
| `jobs.listActive`        | GET `/jobs/active`                        | User      | The caller's in-flight jobs (`queued`, `waiting_retry`, `stalled`, `running`, `canceling`) with `createdAt` for elapsed time |
| `jobs.cancel`            | POST `/jobs/{jobId}/cancel`               | Job owner | Queued → canceled now; running → `canceling` at the next heartbeat                                                           |
| `jobs.retry`             | POST `/jobs/{jobId}/retry`                | Job owner | Re-queue a failed or canceled job; completed stages are skipped; `CONFLICT`                                                  |

### courses / workspace

| Procedure            | Method / path                                                     | Auth | Purpose                                                                            |
| -------------------- | ----------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `courses.list`       | GET `/courses`                                                    | User | Own courses, cursor-paged, with progress                                           |
| `courses.get`        | GET `/courses/{owner}/{repo}/{slug}`                              | User | Overview + outline, `draft`, `newerVersionAvailable`, versions                     |
| `courses.getChapter` | GET `/course-versions/{versionId}/chapters/{chapterKey}`          | User | One chapter with quiz questions (no answer key)                                    |
| `courses.getSource`  | GET `/course-versions/{versionId}/source`                         | User | One file at the pinned commit with a commit-pinned permalink                       |
| `courses.delete`     | DELETE `/courses/{courseId}`                                      | User | Deletes the course with its versions and progress                                  |
| `workspace.graph`    | GET `/course-versions/{versionId}/workspace/graph`                | User | Graph nodes/edges, tours, diagram summaries, layers and domains                    |
| `workspace.node`     | GET `/course-versions/{versionId}/workspace/nodes/{nodeId}`       | User | One node with its incoming/outgoing edges and refs                                 |
| `workspace.diagram`  | GET `/course-versions/{versionId}/workspace/diagrams/{diagramId}` | User | One typed `DiagramSpec` with its refs; `DIAGRAM_NOT_FOUND`                         |
| `workspace.tree`     | GET `/course-versions/{versionId}/workspace/tree`                 | User | Every file in the pinned snapshot: path, size, language, role, `readable`, `cited` |

### learning / search / dashboard

| Procedure                   | Method / path                                | Auth | Purpose                                                                                                                    |
| --------------------------- | -------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| `learning.getProgress`      | GET `/learning/{courseId}/progress`          | User | Per-course progress with `nextLessonKey` and quiz attempts                                                                 |
| `learning.history`          | GET `/learning/{courseId}/history`           | User | Paginated lesson history, newest first                                                                                     |
| `learning.markLesson`       | POST `/learning/lessons`                     | User | Mark a lesson `in_progress` or `completed`                                                                                 |
| `learning.unmarkLesson`     | POST `/learning/unmark-lesson`               | User | Clears a lesson's progress                                                                                                 |
| `learning.submitQuiz`       | POST `/learning/quiz`                        | User | Grades one answer; the correct key and explanation come back here                                                          |
| `search.all`                | GET `/search`                                | User | One query across repositories, courses, lessons, snapshot files and saved dashboards                                       |
| `dashboard.summary`         | GET `/dashboard/summary`                     | User | Course counts, in-flight jobs, resume target, reading totals                                                               |
| `dashboard.recent`          | GET `/dashboard/recent?tz=`                  | User | Recent activity in the caller's time zone, paginated                                                                       |
| `dashboard.analytics`       | POST `/dashboard/analytics`                  | User | Bucketed series, success rate, median time to ready and model usage at day/week/month granularity for one `AnalyticsQuery` |
| `dashboard.save`            | POST `/dashboard/dashboards`                 | User | Saves a named dashboard; `DASHBOARD_NAME_TAKEN` (409)                                                                      |
| `dashboard.listDashboards`  | GET `/dashboard/dashboards`                  | User | The caller's saved dashboards, cursor-paged                                                                                |
| `dashboard.deleteDashboard` | DELETE `/dashboard/dashboards/{dashboardId}` | User | Deletes one saved dashboard                                                                                                |

### notifications / settings

| Procedure                   | Method / path                     | Auth | Purpose                                                               |
| --------------------------- | --------------------------------- | ---- | --------------------------------------------------------------------- |
| `notifications.list`        | GET `/notifications`              | User | In-app notifications, opaque cursor paging                            |
| `notifications.unreadCount` | GET `/notifications/unread-count` | User | `{ count }`                                                           |
| `notifications.markRead`    | POST `/notifications/{id}/read`   | User | Marks one read                                                        |
| `notifications.markAllRead` | POST `/notifications/read-all`    | User | `{ updated }`                                                         |
| `notifications.delete`      | DELETE `/notifications/{id}`      | User | Deletes one notification                                              |
| `settings.get`              | GET `/settings`                   | User | Theme, default audience, auto-advance, quizzes, browser notifications |
| `settings.update`           | PATCH `/settings`                 | User | Partial update; returns the stored preferences                        |

### admin (role-gated)

Every `admin.*` procedure requires `user.role = 'admin'`; a non-admin gets **404** (`Admin screen`), never 403.

| Procedure        | Method / path             | Purpose                                                                  |
| ---------------- | ------------------------- | ------------------------------------------------------------------------ |
| `admin.overview` | GET `/admin/overview`     | Users, repositories, courses, jobs in flight, failures last 24h, storage |
| `admin.users`    | GET `/admin/users`        | Every user with repository/course/job counts; optional `q` filter        |
| `admin.jobs`     | GET `/admin/jobs`         | Every user's jobs, filterable by status, offset-paged                    |
| `admin.job`      | GET `/admin/jobs/{jobId}` | One job with its stage timings                                           |
| `admin.queues`   | GET `/admin/queues`       | Queue depth, active and failed counts per pg-boss queue                  |
| `admin.system`   | GET `/admin/system`       | Database reachability, queues, job counts, storage bytes, version        |

Admin responses are metadata only: no keys, prompts or private source.

## REST / SSE (outside the contract)

| Route                                            | Auth                       | Purpose                                                                                                |
| ------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /auth/:provider/start?intent=sign-in\|link` | — (`link` needs a session) | Starts GitHub or Google sign-in (PKCE + state in a 10 min cookie)                                      |
| `GET /auth/:provider/callback`                   | State cookie               | Exchanges the code, then signs in or links; failures redirect to `/login?error=CODE`                   |
| `GET /jobs/:id/events`                           | Job owner                  | SSE progress; event `id` = `job_events.id`; replay via `Last-Event-ID`; closes after a terminal status |
| `GET /notifications/stream`                      | User session               | SSE unread count; at most 5 open streams per user (429 `TOO_MANY_STREAMS`)                             |
| `GET /github/setup`                              | User session               | GitHub App setup redirect; links an installation for the signed-in user                                |
| `GET /healthz`                                   | —                          | Liveness                                                                                               |
| `GET /readyz`                                    | —                          | Readiness (DB `select 1`)                                                                              |

There is **no webhook endpoint** (D-114).

## Typed errors

`REPO_TOO_LARGE {metric, value, limit}` · `REPO_NOT_ACCESSIBLE` · `UNSUPPORTED_LANGUAGE` · `KEY_INVALID` · `KEY_ALREADY_EXISTS` · `KEY_CHECK_UNAVAILABLE` · `MODEL_NOT_ALLOWED { modelId }` · `IDEMPOTENCY_KEY_REQUIRED` · `DASHBOARD_NAME_TAKEN` · `DIAGRAM_NOT_FOUND` · `GITHUB_RELINK_REQUIRED` · `CONFLICT`, plus oRPC built-ins (`UNAUTHORIZED`, `NOT_FOUND`, `BAD_REQUEST`…).

Key and model refusals are raised **before any job work starts**, never mid-job. A key deleted while a job runs fails that job with `KEY_REMOVED`; it is a job error, not an API error.

## Adding a procedure

1. Define input/output/errors in `packages/contracts/src/<area>.ts` and add it to `contract` in `index.ts`.
2. Implement in `apps/api/src/modules/<module>/<module>.router.ts` using `authed.<area>.<proc>.handler(...)`; call the module's **service**, not its repo.
3. Add a contract test and, when it names a record, a **cross-user 404 test** (`router.cross-user.integration.test.ts`).
4. Use it in the product app via `orpc.<area>.<proc>.queryOptions()` / `.mutationOptions()`.
5. Update this table.
