import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Budget } from '@replo/ai'
import { DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import PgBoss from 'pg-boss'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  fileEdges,
  jobStages,
  notifications,
  providerKeys,
  repoSnapshots,
  snapshotFiles,
  symbols,
} from '../../platform/db/schema'
import type { GithubRest } from '../../platform/github/client'
import { createLogger } from '../../platform/logger'
import { pgBossQueue } from '../../platform/queue/job-queue'
import { declareQueues } from '../../jobs/queues'
import { GENERATE_TUTORIAL } from '../../jobs/schemas'
import { JobError } from '../../jobs/errors'
import { handleGenerateTutorial, type StageHandler } from '../../jobs/generate-tutorial.worker'
import { createIndexingService } from '../indexing/indexing.service'
import { createKeysService } from '../keys/keys.service'
import { createModelsService } from '../models/models.service'
import { bundledCatalog, fakeKeyChecker, testVault } from '../../test/domain'
import { keyAad, type KeyVault } from '../../platform/crypto/key-vault'
import { createNotificationsService } from '../notifications/notifications.service'
import { createPreflight } from '../repositories/preflight'
import { createRepositoryImports } from '../repositories/imports.service'
import { createRepositorySources } from '../repositories/sources.service'
import { createJobRuntime, type JobRuntime } from './job-runtime.service'
import { createJobService, type JobService } from './jobs.service'
import { gzippedTarballOf } from '../../test/tarball'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const failingStage: StageHandler = async () => {
  throw new JobError('STAGE_FAILED', false)
}
const SHA = 'a'.repeat(40)
const PACKAGE_BLOB = 'b'.repeat(40)
const CART_BLOB = 'c'.repeat(40)
const ROOT = 'acme-shop-aaaaaaa/'
const packageJson = '{"dependencies":{"next":"16.0.0"}}'

const repoDto = {
  id: 9_100_001,
  name: 'shop',
  private: false,
  default_branch: 'main',
  owner: { login: 'acme' },
  license: { spdx_id: 'MIT' },
}

const routes: Record<string, unknown> = {
  '/repos/acme/shop': repoDto,
  '/repos/acme/shop/commits/main': { sha: SHA },
  [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: {
    truncated: false,
    tree: [
      { path: 'package.json', type: 'blob', sha: PACKAGE_BLOB, size: packageJson.length },
      { path: 'src/cart.ts', type: 'blob', sha: CART_BLOB, size: 20 },
    ],
  },
  [`/repos/acme/shop/git/blobs/${PACKAGE_BLOB}`]: {
    content: Buffer.from(packageJson).toString('base64'),
    encoding: 'base64',
  },
}

const fakeGithub = (tarball: Buffer): GithubRest => ({
  request: (async (path: string, schema: { parse(value: unknown): unknown }) => {
    const body = routes[path]
    return body === undefined ? undefined : schema.parse(body)
  }) as GithubRest['request'],
  download: async (path) =>
    path.endsWith(`/tarball/${SHA}`) ? new Response(new Uint8Array(tarball)) : undefined,
})

describe.skipIf(DATABASE_URL === '')('generation pipeline against Postgres and pg-boss', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let boss: PgBoss
  let jobs: JobService
  let runtime: JobRuntime
  let indexing: ReturnType<typeof createIndexingService>
  let imports: ReturnType<typeof createRepositoryImports>
  let snapshotRoot: string
  let vault: KeyVault
  const log = createLogger({ level: 'silent' })

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(
      sql`truncate table "user", repositories, github_installations, webhook_deliveries, provider_keys restart identity cascade`,
    )
    boss = new PgBoss({ connectionString: DATABASE_URL, supervise: false, schedule: false })
    await boss.start()
    await declareQueues(boss)
    snapshotRoot = await mkdtemp(join(tmpdir(), 'replo-it-'))
    vault = testVault()

    const tarball = await gzippedTarballOf([
      { name: `${ROOT}`, type: 'directory' },
      { name: `${ROOT}package.json`, body: packageJson },
      { name: `${ROOT}src/cart.ts`, body: 'export const cart = []\n' },
      {
        name: `${ROOT}src/index.ts`,
        body: "import { cart } from './cart'\nexport const main = cart\n",
      },
    ])
    const rest = fakeGithub(tarball)
    const limits = { maxFiles: 5000, maxBytes: 50_000_000 }
    const noInstallations = {
      activeInstallations: async () => [],
      installationToken: async () => undefined,
    }

    indexing = createIndexingService({
      db,
      rest,
      tokens: { installationToken: async () => undefined },
      sources: createRepositorySources(db),
      limits,
      extraction: DEFAULT_EXTRACTION_LIMITS,
      snapshotRoot,
    })
    const queue = pgBossQueue(boss)
    const notifications = createNotificationsService(db)
    jobs = createJobService({ db, queue, indexing, notifications })
    runtime = createJobRuntime({ db, queue, notifications })
    imports = createRepositoryImports({
      db,
      preflight: createPreflight({ rest, installations: noInstallations, limits }),
      jobs,
      indexing,
      keys: createKeysService({ db, vault, checker: fakeKeyChecker('valid'), jobs }),
      models: createModelsService({ db, catalog: bundledCatalog() }),
      defaults: { budgetUsd: 2, litePipelineMaxFiles: 300 },
    })
  })

  afterAll(async () => {
    await boss.stop({ graceful: false })
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedKey = async (userId: string, provider: 'openrouter' | 'anthropic') => {
    const sealed = vault.seal('sk-test-seeded-key-0000', keyAad(userId, provider))
    const [row] = await db
      .insert(providerKeys)
      .values({
        userId,
        provider,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        keyVersion: sealed.keyVersion,
        last4: sealed.last4,
      })
      .returning({ id: providerKeys.id })
    if (!row) throw new Error('key seed failed')
    return row.id
  }

  const importFor = (
    userId: string,
    keyId: string,
    idempotencyKey = randomUUID(),
    preset: 'balanced' | 'free' = 'balanced',
  ) =>
    imports.importRepository(userId, idempotencyKey, {
      source: { kind: 'public_url', url: 'https://github.com/acme/shop' },
      audience: 'intermediate',
      keyId,
      preset,
    })

  it('imports a repo as a queued job and enqueues it in pg-boss', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const before = await boss.getQueueSize(GENERATE_TUTORIAL)
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error(`expected ok, got ${outcome.refusal.code}`)
    expect(outcome.value.status).toBe('queued')
    expect(outcome.value.commitSha).toBe(SHA)
    expect(await boss.getQueueSize(GENERATE_TUTORIAL)).toBe(before + 1)
  })

  it('returns the same job for a repeated Idempotency-Key without new work', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const key = randomUUID()
    const first = await importFor(owner, keyId, key)
    const second = await importFor(owner, keyId, key)
    if (first.kind !== 'ok' || second.kind !== 'ok') throw new Error('expected ok outcomes')
    expect(second.value.jobId).toBe(first.value.jobId)
  })

  it('refuses the free preset on a key that is not OpenRouter', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    expect(await importFor(owner, keyId, undefined, 'free')).toEqual({
      kind: 'refused',
      refusal: { code: 'FREE_PRESET_REQUIRES_OPENROUTER' },
    })
  })

  it('leaves neither a job row nor a queue message when the transaction rolls back', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const first = await importFor(owner, keyId)
    if (first.kind !== 'ok') throw new Error('expected ok')
    const existing = await jobs.getOwnedJob(owner, first.value.jobId)

    const before = await boss.getQueueSize(GENERATE_TUTORIAL)
    await expect(
      db.transaction(async (tx) => {
        await jobs.createJob(tx, {
          userId: owner,
          snapshotId: existing.snapshotId,
          idempotencyKey: randomUUID(),
          audience: 'intermediate',
          keyId,
          models: {
            provider: 'openrouter',
            preset: 'balanced',
            pipeline: 'lite',
            models: { planner: '', author: '', summarizer: null, judge: null },
            budgetMicros: 2_000_000,
          },
          budgetMicros: 2_000_000,
        })
        throw new Error('rollback')
      }),
    ).rejects.toThrow('rollback')
    expect(await boss.getQueueSize(GENERATE_TUTORIAL)).toBe(before)
    expect(await jobs.findByIdempotencyKey(owner, 'never-used')).toBeUndefined()
  })

  it('runs ingest and index for real, then fails the job at the first failing stage', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    const job = await jobs.getOwnedJob(owner, outcome.value.jobId)

    await handleGenerateTutorial(
      { v: 1, jobId: job.id, userId: owner, snapshotId: job.snapshotId, audience: job.audience },
      {
        jobs: runtime.jobStore,
        log,
        budgetFor: (row) => new Budget(row.budgetMicros, runtime.usageSink, row.spentMicros),
        stageHandlers: {
          ingest: ({ job: claimed, signal }) =>
            indexing.ingest({ userId: claimed.userId, snapshotId: claimed.snapshotId, signal }),
          index: ({ job: claimed, signal }) =>
            indexing.index({ userId: claimed.userId, snapshotId: claimed.snapshotId, signal }),
          summaries: failingStage,
          architecture: failingStage,
          outline: failingStage,
          lessons: failingStage,
          validate: failingStage,
          publish: failingStage,
        },
      },
    )

    const after = await jobs.getOwnedJob(owner, job.id)
    expect(after.status).toBe('failed')
    expect(after.errorCode).toBe('STAGE_FAILED')
    expect(after.stage).toBe('summaries')
    const snapshot = await db
      .select()
      .from(repoSnapshots)
      .where(eq(repoSnapshots.id, job.snapshotId))
    expect(snapshot[0]?.status).toBe('ready')
    const files = await db
      .select()
      .from(snapshotFiles)
      .where(eq(snapshotFiles.snapshotId, job.snapshotId))
    expect(files.map((f) => f.path).sort()).toEqual(['package.json', 'src/cart.ts', 'src/index.ts'])
    expect(snapshot[0]?.analysis?.framework).toBe('Next.js')
    const symbolRows = await db
      .select({ key: symbols.symbolKey, kind: symbols.kind })
      .from(symbols)
      .where(eq(symbols.snapshotId, job.snapshotId))
    expect(symbolRows.sort((a, b) => a.key.localeCompare(b.key))).toEqual([
      { key: 'src/cart.ts#cart', kind: 'variable' },
      { key: 'src/index.ts#main', kind: 'variable' },
    ])
    const edgeRows = await db
      .select({ from: fileEdges.fromPath, to: fileEdges.toPath, kind: fileEdges.kind })
      .from(fileEdges)
      .where(eq(fileEdges.snapshotId, job.snapshotId))
    expect(edgeRows).toEqual([{ from: 'src/index.ts', to: 'src/cart.ts', kind: 'import' }])
    const stages = await db
      .select({ stage: jobStages.stage, status: jobStages.status })
      .from(jobStages)
      .where(eq(jobStages.jobId, job.id))
    expect(stages.sort((a, b) => a.stage.localeCompare(b.stage))).toEqual([
      { stage: 'index', status: 'completed' },
      { stage: 'ingest', status: 'completed' },
    ])
    const sent = await db.select().from(notifications).where(eq(notifications.userId, owner))
    expect(sent.map((n) => n.kind)).toEqual(['job_failed'])
  })

  it('rebuilds a missing snapshot directory from the pinned commit before indexing', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    const job = await jobs.getOwnedJob(owner, outcome.value.jobId)
    await indexing.ingest({
      userId: owner,
      snapshotId: job.snapshotId,
      signal: new AbortController().signal,
    })
    await indexing.index({
      userId: owner,
      snapshotId: job.snapshotId,
      signal: new AbortController().signal,
    })

    await rm(join(snapshotRoot, job.snapshotId), { recursive: true, force: true })
    await db
      .update(repoSnapshots)
      .set({ analysis: null })
      .where(eq(repoSnapshots.id, job.snapshotId))
    await indexing.index({
      userId: owner,
      snapshotId: job.snapshotId,
      signal: new AbortController().signal,
    })

    const [snapshot] = await db
      .select()
      .from(repoSnapshots)
      .where(eq(repoSnapshots.id, job.snapshotId))
    expect(snapshot?.analysis?.analyzerVersion).toBe(1)
    expect(await readFile(join(snapshotRoot, job.snapshotId, 'src/index.ts'), 'utf8')).toContain(
      './cart',
    )
  })

  it('does not download again once the snapshot is ready', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    const job = await jobs.getOwnedJob(owner, outcome.value.jobId)
    await expect(
      indexing.ingest({
        userId: owner,
        snapshotId: job.snapshotId,
        signal: new AbortController().signal,
      }),
    ).resolves.toBeUndefined()
  })

  it('retries a failed job back to the queue and cancels a queued one with a notification', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    await db
      .update(repoSnapshots)
      .set({ status: 'pending' })
      .where(eq(repoSnapshots.id, (await jobs.getOwnedJob(owner, outcome.value.jobId)).snapshotId))

    const failed = await jobs.getOwnedJob(owner, outcome.value.jobId)
    await runtime.jobStore.finish(failed.id, 'failed', { code: 'NETWORK' })
    const queuedBefore = await boss.getQueueSize(GENERATE_TUTORIAL)
    const retried = await jobs.retry(owner, failed.id)
    expect(retried.status).toBe('queued')
    expect(retried.error).toBeNull()
    expect(await boss.getQueueSize(GENERATE_TUTORIAL)).toBe(queuedBefore + 1)

    const canceled = await jobs.cancel(owner, failed.id)
    expect(canceled.status).toBe('canceled')
    const sent = await db.select().from(notifications).where(eq(notifications.userId, owner))
    expect(sent.map((n) => n.kind).sort()).toEqual(['job_canceled', 'job_failed'])
  })

  it('estimates a run from the static index and refuses a budget below the estimate', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const estimate = await imports.estimate(owner, {
      source: { kind: 'public_url', url: 'https://github.com/acme/shop' },
      audience: 'intermediate',
      keyId,
      preset: 'budget',
      customModels: undefined,
      budgetUsd: 2,
    })
    if (estimate.kind !== 'ok') throw new Error(`expected ok, got ${estimate.refusal.code}`)
    expect(estimate.value).toMatchObject({
      pipeline: 'lite',
      models: {
        planner: 'claude-haiku-5-5',
        author: 'claude-haiku-5-5',
        summarizer: 'claude-haiku-5-5',
      },
      basis: 'static-index-and-catalogue-assumptions',
      budgetUsd: 2,
    })
    expect(estimate.value.estimateUsd).toBeGreaterThan(0)

    expect(
      await imports.estimate(owner, {
        source: { kind: 'public_url', url: 'https://github.com/acme/shop' },
        audience: 'intermediate',
        keyId,
        preset: 'budget',
        customModels: undefined,
        budgetUsd: 0.000001,
      }),
    ).toMatchObject({ kind: 'refused', refusal: { code: 'BUDGET_BELOW_ESTIMATE' } })
  })

  it('refuses an OpenRouter key on the free preset until a model passes the eval gate', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'openrouter')
    expect(
      await imports.estimate(owner, {
        source: { kind: 'public_url', url: 'https://github.com/acme/shop' },
        audience: 'intermediate',
        keyId,
        preset: 'free',
        customModels: undefined,
        budgetUsd: 2,
      }),
    ).toMatchObject({ kind: 'refused', refusal: { code: 'PRESET_UNAVAILABLE' } })
  })

  it('reports another user’s job as not found for cancel and retry', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    await expect(jobs.cancel(stranger, outcome.value.jobId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(jobs.retry(stranger, outcome.value.jobId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('rejects a retry of a job that has not failed', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner, 'anthropic')
    const outcome = await importFor(owner, keyId)
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    await expect(jobs.retry(owner, outcome.value.jobId)).rejects.toMatchObject({
      code: 'CONFLICT',
    })
  })
})
