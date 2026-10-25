import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  llmCalls,
  notifications,
  repoSnapshots,
  repositories,
} from '../../platform/db/schema'
import { createJobRuntime, type JobRuntime } from '../generation/job-runtime.service'
import { createJobService, type JobService } from '../generation/jobs.service'
import { createModelsService } from '../models/models.service'
import { createNotificationsService } from '../notifications/notifications.service'
import { bundledCatalog, fakeKeyChecker, testVault } from '../../test/domain'
import { createKeysService, type KeysService } from './keys.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SECRET = 'sk-ant-api03-test-secret-value-0000-9f3a'

describe.skipIf(DATABASE_URL === '')('keys and models against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let keys: KeysService
  let rejectingKeys: KeysService
  let jobService: JobService
  let runtime: JobRuntime

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
    const vault = testVault()
    const queue = { send: async () => null }
    const notifications = createNotificationsService(db)
    jobService = createJobService({
      db,
      queue,
      indexing: { snapshotRef: async () => undefined },
      notifications,
    })
    runtime = createJobRuntime({ db, queue, notifications })
    keys = createKeysService({ db, vault, checker: fakeKeyChecker('valid'), jobs: jobService })
    rejectingKeys = createKeysService({
      db,
      vault,
      checker: fakeKeyChecker('invalid'),
      jobs: jobService,
    })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  it('stores a validated key and shows only its last four characters', async () => {
    const owner = await seedUser()
    const outcome = await keys.add(owner, {
      provider: 'anthropic',
      label: 'default',
      apiKey: SECRET,
    })
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    expect(outcome.value.last4).toBe('9f3a')
    const listed = JSON.stringify(await keys.list(owner))
    expect(listed).not.toContain(SECRET)
    expect(listed).not.toContain('api03')
  })

  it('stores nothing when the provider rejects the key', async () => {
    const owner = await seedUser()
    expect(
      await rejectingKeys.add(owner, { provider: 'openai', label: 'default', apiKey: SECRET }),
    ).toEqual({ kind: 'refused', refusal: { code: 'KEY_INVALID' } })
    expect(await keys.list(owner)).toEqual([])
  })

  it('refuses a second key with the same provider and label', async () => {
    const owner = await seedUser()
    await keys.add(owner, { provider: 'openai', label: 'work', apiKey: SECRET })
    expect(await keys.add(owner, { provider: 'openai', label: 'work', apiKey: SECRET })).toEqual({
      kind: 'refused',
      refusal: { code: 'KEY_ALREADY_EXISTS' },
    })
  })

  it('opens a stored key for its owner only and reports other users as not found', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const outcome = await keys.add(owner, { provider: 'google', label: 'default', apiKey: SECRET })
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    expect(await keys.openForJob(owner, outcome.value.id)).toEqual({
      provider: 'google',
      decryptedKey: SECRET,
    })
    expect(await keys.openForJob(stranger, outcome.value.id)).toBeUndefined()
    await expect(keys.validate(stranger, outcome.value.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(keys.delete(stranger, outcome.value.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('deleting a key fails its running and queued jobs with KEY_REMOVED and never retries them', async () => {
    const owner = await seedUser()
    const outcome = await keys.add(owner, { provider: 'openai', label: 'doomed', apiKey: SECRET })
    if (outcome.kind !== 'ok') throw new Error('expected ok')
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: 9_200_001,
        owner: 'acme',
        name: 'shop',
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({ repositoryId: repo!.id, commitSha: 'd'.repeat(40), analyzerVersion: 1 })
      .returning({ id: repoSnapshots.id })
    const plan = {
      provider: 'openai' as const,
      preset: 'budget' as const,
      pipeline: 'lite' as const,
      models: {
        planner: 'gpt-5.4-mini',
        author: 'gpt-5.4-mini',
        summarizer: 'gpt-5.4-mini',
        judge: null,
      },
      budgetMicros: 2_000_000,
    }
    const jobs = await db
      .insert(generationJobs)
      .values([
        {
          userId: owner,
          snapshotId: snapshot!.id,
          kind: 'generate',
          status: 'running',
          idempotencyKey: randomUUID(),
          keyId: outcome.value.id,
          models: plan,
          budgetMicros: 2_000_000,
        },
        {
          userId: owner,
          snapshotId: snapshot!.id,
          kind: 'generate',
          status: 'queued',
          idempotencyKey: randomUUID(),
          keyId: outcome.value.id,
          models: plan,
          budgetMicros: 2_000_000,
        },
        {
          userId: owner,
          snapshotId: snapshot!.id,
          kind: 'generate',
          status: 'succeeded',
          idempotencyKey: randomUUID(),
          keyId: outcome.value.id,
          models: plan,
          budgetMicros: 2_000_000,
        },
      ])
      .returning({ id: generationJobs.id, status: generationJobs.status })

    await keys.delete(owner, outcome.value.id)

    const after = await db
      .select({
        id: generationJobs.id,
        status: generationJobs.status,
        errorCode: generationJobs.errorCode,
        keyId: generationJobs.keyId,
      })
      .from(generationJobs)
      .where(eq(generationJobs.userId, owner))
    const byId = new Map(after.map((row) => [row.id, row]))
    const running = byId.get(jobs[0]!.id)
    const queued = byId.get(jobs[1]!.id)
    const succeeded = byId.get(jobs[2]!.id)
    expect(running).toMatchObject({ status: 'failed', errorCode: 'KEY_REMOVED', keyId: null })
    expect(queued).toMatchObject({ status: 'failed', errorCode: 'KEY_REMOVED' })
    expect(succeeded).toMatchObject({ status: 'succeeded', errorCode: null })
    const sent = await db.select().from(notifications).where(eq(notifications.userId, owner))
    expect(sent.map((n) => n.kind).sort()).toEqual(['job_failed', 'job_failed'])
    expect(await runtime.jobStore.heartbeat(jobs[0]!.id)).toBe('stopped')
  })

  it('records each provider call and adds its cost to the job spend', async () => {
    const owner = await seedUser()
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: 9_200_002,
        owner: 'acme',
        name: 'ledger',
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({ repositoryId: repo!.id, commitSha: 'e'.repeat(40), analyzerVersion: 1 })
      .returning({ id: repoSnapshots.id })
    const [job] = await db
      .insert(generationJobs)
      .values({
        userId: owner,
        snapshotId: snapshot!.id,
        kind: 'generate',
        status: 'running',
        idempotencyKey: randomUUID(),
        models: {
          provider: 'anthropic',
          preset: 'balanced',
          pipeline: 'full',
          models: { planner: 'x', author: 'x', summarizer: null, judge: null },
          budgetMicros: 2_000_000,
        },
        budgetMicros: 2_000_000,
      })
      .returning({ id: generationJobs.id })

    await runtime.usageSink({
      jobId: job!.id,
      stage: 'lessons',
      spec: {
        provider: 'anthropic',
        id: 'claude-sonnet-5-5',
        inputUsdPerMTok: 2,
        outputUsdPerMTok: 10,
        structuredOutput: true,
        free: false,
      },
      inputTokens: 1_000,
      outputTokens: 200,
      costMicros: 4_000,
      latencyMs: 812,
    })

    const [row] = await db.select().from(llmCalls).where(eq(llmCalls.jobId, job!.id))
    expect(row).toMatchObject({
      stage: 'lessons',
      provider: 'anthropic',
      model: 'claude-sonnet-5-5',
      inputTokens: 1_000,
      outputTokens: 200,
      costMicros: 4_000,
    })
    const [after] = await db
      .select({ spent: generationJobs.spentMicros })
      .from(generationJobs)
      .where(eq(generationJobs.id, job!.id))
    expect(after?.spent).toBe(4_000)
  })

  it('stores preferences with the budget in micro-dollars and rejects a custom model outside the catalogue', async () => {
    const owner = await seedUser()
    const models = createModelsService({ db, catalog: bundledCatalog() })
    expect(await models.getPreferences(owner)).toEqual({
      preset: 'balanced',
      customModels: null,
      defaultBudgetUsd: null,
    })
    expect(
      await models.setPreferences(owner, {
        preset: 'budget',
        customModels: null,
        defaultBudgetUsd: 2.5,
      }),
    ).toMatchObject({ kind: 'ok' })
    expect((await models.getPreferences(owner)).defaultBudgetUsd).toBe(2.5)
    expect(
      await models.setPreferences(owner, {
        preset: 'custom',
        customModels: { planner: 'unlisted/model-not-in-catalogue' },
        defaultBudgetUsd: null,
      }),
    ).toEqual({
      kind: 'refused',
      refusal: { role: 'planner', modelId: 'unlisted/model-not-in-catalogue' },
    })
  })
})
