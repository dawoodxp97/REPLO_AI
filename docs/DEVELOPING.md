# DEVELOPING.md — run it, extend it, wire it up

Practical guide. Rules live in [`RULES.md`](../RULES.md); the _why_ in [`PRD.md`](../PRD.md). Code references are real files in this repo.

## 1. Run it locally

**Prereqs:** Node 24 (`nvm use`), pnpm 11 (`corepack enable`), Docker (Postgres 17 + MinIO). Without Docker you can use any local Postgres 17 — pgvector and MinIO aren't used yet.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/product/.env.example apps/product/.env.local
cp apps/landing/.env.example apps/landing/.env.local
```

Edit `apps/api/.env`: set `BETTER_AUTH_SECRET` and `KEY_ENCRYPTION_KEY` (each `openssl rand -base64 32`; the KEK must be base64 of exactly 32 bytes). Everything else has dev defaults.

```bash
pnpm infra:up        # Postgres :5432 (user/pass/db = app/app/replo) + MinIO :9000
pnpm db:migrate      # applies apps/api/drizzle/*.sql (pg-boss creates its own `pgboss` schema on first worker start)
pnpm dev             # landing :3000 · product :3001 · api :4000 · worker (health :4001)
```

Run one thing: `pnpm dev:landing`, `pnpm dev:product`, `pnpm dev:api` (api + worker). Quality gate: `pnpm verify`.

**Health checks:** `curl localhost:4000/healthz` (liveness), `/readyz` (DB), `curl localhost:4001/healthz` (worker).

### GitHub sign-in (needed to see the logged-in UI)

The auth provider is only enabled when `GITHUB_APP_CLIENT_ID/SECRET` are set. Create a GitHub App (Settings → Developer settings → GitHub Apps):

- Callback URL: `http://localhost:4000/api/auth/callback/github`
- Permissions: Repository **Contents: read-only**, **Metadata: read-only** (nothing else)
- Webhook URL: `https://<tunnel>/webhooks/github` (use smee.io / ngrok to reach localhost:4000), secret = `GITHUB_WEBHOOK_SECRET`; events: Installation, Installation repositories, Repository (Push later)
- Put App ID, client id/secret, base64 private key (`base64 -i key.pem`), slug in `apps/api/.env`.

Then open `http://localhost:3001/login` → "Continue with GitHub". The session cookie is set by the API (`localhost:4000`) and sent with `credentials: 'include'`; CORS is locked to `PRODUCT_ORIGIN`.

### What works today vs. stubs

Works: auth routes, `me.get`, `jobs.get`, SSE endpoint, webhook verify+dedupe, worker loop (a job fails with `STAGE_NOT_IMPLEMENTED`). Everything else returns `NOT_IMPLEMENTED` until its phase (see [`API.md`](./API.md), [`ROADMAP.md`](../ROADMAP.md)).

## 2. Write an API endpoint (contract-first)

The contract in `packages/contracts` is the single source of truth. TypeScript then **forces** the API to implement it and gives the frontend a typed client.

**Example: `repositories.listMine`** (list the user's imported repos).

1. **Contract** — `packages/contracts/src/repositories.ts`:

```ts
export const repositoriesContract = {
  // …existing procedures
  listMine: oc
    .route({ method: 'GET', path: '/repositories' })
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }))
    .output(
      z.array(
        z.object({ id: z.uuid(), owner: z.string(), name: z.string(), isPrivate: z.boolean() }),
      ),
    )
    .errors({ SOME_DOMAIN_ERROR: { data: z.object({ reason: z.string() }) } }), // typed errors are optional
}
```

2. **Repo** (private data access, the only place that touches tables) — `apps/api/src/modules/repositories/repositories.repo.ts`:

```ts
export const repositoriesRepo = (db: DbOrTx) => ({
  listForUser: (userId: string, limit: number) =>
    db
      .select({
        id: repositories.id,
        owner: repositories.owner,
        name: repositories.name,
        isPrivate: repositories.isPrivate,
      })
      .from(userRepositories)
      .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
      .where(and(eq(userRepositories.userId, userId), isNull(userRepositories.revokedAt))) // ALWAYS scope by user
      .limit(limit),
})
```

3. **Service** (public API of the module) — one `*.service.ts` per role, for example `library.service.ts`: `createRepositoryLibrary({ db, … })` returning `{ list(userId, input) }`; map rows → DTOs here. Keep each service to one job and depend on other modules through `Pick<OtherService, 'method'>`, never on their repos.
4. **Register the service** in `apps/api/src/composition.ts` (`createDomainServices`, in dependency order, no closures over later services) and, if a router uses it, add it to `Services` in `context.ts` and `createServices`.
5. **Router** — `repositories.router.ts` replaces the stub:

```ts
listMine: authed.repositories.listMine.handler(({ input, context }) =>
  context.services.repositories.listMine(context.user.id, input.limit)),
```

`authed` rejects anonymous callers (401). Use `os` instead of `authed` for public procedures (like `tutorials.get`). Throw typed errors with `errors.SOME_DOMAIN_ERROR({ data: { reason } })`; use `notFound()` for foreign IDs (404, never 403).

6. **Test** — contract/service test **plus a cross-user 404 test** for anything touching private data.
7. **Docs** — update the table in `docs/API.md`.

If you forget to implement a contract procedure, `pnpm typecheck` fails in `apps/api` (the root `os.router({...})` must satisfy the contract).

### Plain REST / SSE / webhooks (outside the contract)

For streaming, raw bodies or third-party callbacks add a Fastify route like `job-events.route.ts` (SSE) or `github.webhook.route.ts` (raw body → HMAC first). Register it in `main.http.ts`. Webhooks go in their **own encapsulated scope** (`app.register(async scope => …)`) because they replace the body parser.

## 3. Integrate it in the frontend

`apps/product/src/lib/orpc.ts` exports a typed `client` and TanStack Query helpers `orpc`. The contract is imported as a **type only**, so no server code ships to the browser.

```tsx
'use client'
const list = useQuery(orpc.repositories.listMine.queryOptions({ input: { limit: 10 } }))

const importRepo = useMutation(
  orpc.repositories.import.mutationOptions({
    onSuccess: (job) => router.push(`/jobs/${job.jobId}`),
  }),
)
importRepo.mutate({ source: { kind: 'public_url', url }, keyId, preset: 'budget' })

if (importRepo.error && isDefinedError(importRepo.error)) {
  importRepo.error.code // 'REPO_TOO_LARGE' | 'KEY_INVALID' | … (typed from the contract)
}
```

- Put screen logic in `src/features/<name>/` (client components); pages in `src/app/**` stay thin.
- Map error codes to specific copy (see `ERROR_COPY` in `features/import/import-form.tsx`).
- Auth state: `authClient` (`lib/auth-client.ts`, Better Auth) for sign-in/out; server truth comes from `orpc.me.get`.
- Live progress: `features/jobs/job-progress.tsx` uses `EventSource(.../jobs/:id/events, { withCredentials: true })`.
- Public/SEO pages (`/t/...`) run on the server: call the API with `API_INTERNAL_URL` there (not the browser URL).
- Use tokens/components from `@replo/ui`; no hard-coded colours (see `DESIGN.md`).

**Known caveat:** `lib/orpc.ts` currently adds a fresh `Idempotency-Key` to _every_ request, which defeats idempotency on retries. Before wiring `repositories.import`, generate the key once per form submit and pass it through the link's `context` instead.

## 4. Background jobs (pg-boss)

Mental model: **`generation_jobs` row = truth; pg-boss only delivers work (at-least-once).** So every handler must be idempotent and resumable.

```
API: enqueue (same DB transaction as the job row) → pg-boss queue (Postgres)
Worker: claim (conditional UPDATE) → for each stage: skip if checkpointed → run → checkpoint → emit job_event
Browser: SSE /jobs/:id/events replays job_events
Reaper (every minute): stale heartbeat → `stalled` → re-sent → resumes at last checkpoint
```

### Enqueue (API side — `generation/jobs.service.ts → createJob`)

```ts
await db.transaction(async (tx) => {
  const existing = await jobsRepo(tx).findByIdempotencyKey(userId, key)   // idempotent
  if (existing) return existing
  const job = await jobsRepo(tx).insert({ … status: 'queued' })
  const payload = GenerateTutorialPayload.parse({ v: 1, jobId: job.id, userId, snapshotId, audience })
  await boss.send(GENERATE_TUTORIAL, payload, {
    singletonKey: job.id, priority: 0,
    db: { executeSql: (text, values) => tx.$client.query(text, values) },   // pg-boss joins THIS transaction
  })
})
```

The HTTP process needs its own `PgBoss` instance for `send` (create it in `main.http.ts` with `{ supervise: false, schedule: false }` so only the worker runs maintenance). The `db:` executor shape is `{ executeSql(text, values) → { rows } }` — adapt it to the Drizzle/pg transaction client and verify with a test (it is sketched, not yet exercised).

### Implement a pipeline stage (worker side)

Stages are `ingest, index, summaries, architecture, outline, lessons, validate, publish` (`packages/contracts/src/jobs.ts → STAGES`). Each stage handler is registered in `apps/api/src/modules/pipeline/pipeline.service.ts → stageHandlers` and implemented under `modules/pipeline/stages/`. A handler:

- is idempotent: it reads its own checkpoint from `job_stage_outputs` first and returns early if the work is already done;
- passes `ctx.signal` to every fetch and LLM call so cancel and timeouts abort cleanly;
- throws `JobError(code, retryable)` for failures the worker should classify;
- writes intermediate results with `deps.outputs.write(jobId, stage, unit, value)`.

The loop in `jobs/generate-tutorial.worker.ts` handles claim, heartbeat (15 s), per-stage timeout, cancel (`CanceledError`), retry with backoff (rethrow → pg-boss), terminal failure, `job_events` and progress. LLM stages call the session from `openSession` (budget-guarded, built on `generateStructured` from `@replo/ai`), never a provider SDK directly. Keep heavy logic in a module service and the stage handler thin.

### Add a new job type (e.g. nightly cleanup)

1. Name + versioned payload in `apps/api/src/jobs/schemas.ts` (`v: 1` discriminated union; parse at enqueue **and** dequeue).
2. Handler in `apps/api/src/jobs/<name>.worker.ts` taking `(raw, deps)` so it is testable with fakes (copy `generate-tutorial.worker.test.ts`).
3. Register in `apps/api/src/main.worker.ts`:

```ts
await boss.createQueue(CLEANUP, { name: CLEANUP, retryLimit: 3, retryBackoff: true }) // v10 requires `name`
await boss.work(CLEANUP, async (batch) => {
  for (const j of batch) await handleCleanup(j.data, deps)
}) // handlers get an ARRAY
await boss.schedule(CLEANUP, '0 3 * * *') // optional cron
```

Tune concurrency with `WORKER_CONCURRENCY` (parallel `work` registrations); keep 1–2 on a 4 GB box.

### Debugging jobs

- `select id,status,stage,attempts,error_code from generation_jobs order by created_at desc limit 10;`
- `select * from job_events where job_id = '…' order by id;` (what the SSE stream replays)
- `select name,state,count(*) from pgboss.job group by 1,2;` (queue state)
- Worker logs are pino JSON (pretty in dev); they never contain keys, tokens or source.

## 5. Other common tasks

| Task                         | How                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Change the DB**            | Edit `apps/api/src/platform/db/schema.ts` → `pnpm db:generate` → **review the SQL** → `pnpm db:migrate`. Breaking changes: expand → backfill → contract across two deploys. Update `docs/DATABASE.md`. |
| **Add an env var**           | Add to the Zod schema in `apps/api/src/platform/config.ts`, to `.env.example`, to `TECH_STACK.md`. Process exits at boot if invalid. Never `NEXT_PUBLIC_` a secret.                                    |
| **Add a module**             | `apps/api/src/modules/<name>/{<name>.repo,<name>.service,<name>.router}.ts`; wire service in `context.ts` + `main.http.ts`; router in `router.ts`. Modules call each other via services only.          |
| **Add a UI primitive**       | `packages/ui/src/components/*.tsx` (Base UI + cva), export from `index.ts`. Composites belong in `apps/product/src/features`.                                                                          |
| **Add a page**               | `apps/product/src/app/(app)/<route>/page.tsx` for authed screens; `app/t/...` for public tutorial pages. Landing is static-export only.                                                                |
| **Add BYOK / use the vault** | `KeyVault.fromEnv(...)`; `seal(key, keyAad(userId, provider))` on `keys.add`, `open(...)` only inside the worker for that job.                                                                         |
| **Call an LLM**              | Build a `Budget`, get the client with `modelFor({ provider, decryptedKey }, modelId)` (the job's key, decrypted in the worker), then `generateStructured({ role, schema, … })`. Prices/models live in the registry/config.                                       |
| **Test**                     | `pnpm --filter @replo/<pkg> test`. Unit tests need no DB. DB tests (migrations, links, webhooks, cross-user 404) run only when `TEST_DATABASE_URL` is set: CI sets it on its Postgres service; locally point it at a **disposable** database, because those tests truncate tables. Never call real providers outside `tools/evals`. |
| **Deploy (later, P8)**       | Landing → Cloudflare Pages (`apps/landing/out`). Product/API/worker → one VPS with Docker Compose + Caddy; `docker compose run --rm migrate` before `up -d`. See `ARCHITECTURE.md §11`.                |
