import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { applyDdl } from '../../platform/db/test-setup'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  notifications,
  repositorySnapshots,
  repositories,
} from '../../platform/db/schema'
import { createJobRuntime, type JobRuntime } from '../jobs/job-runtime.service'
import { createJobService, type JobService } from '../jobs/jobs.service'
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
    await applyDdl(pool)
    await db.execute(
      sql`truncate table users, repositories, github_installations, provider_keys restart identity cascade`,
    )
    const vault = testVault()
    const queue = { send: async () => null }
    const notifications = createNotificationsService(db)
    jobService = createJobService({
      db,
      queue,
      indexing: { snapshotRef: async () => undefined },
      notifications,
      courses: { refOf: async () => undefined },
      repositories: { describeLinked: async () => new Map() },
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
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
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
      .insert(repositorySnapshots)
      .values({ repositoryId: repo!.id, commitSha: 'd'.repeat(40), analyzerVersion: 1 })
      .returning({ id: repositorySnapshots.id })
    const plan = {
      provider: 'openai' as const,
      pipeline: 'lite' as const,
      models: {
        planner: 'gpt-5.4-mini',
        author: 'gpt-5.4-mini',
        summarizer: 'gpt-5.4-mini',
        judge: null,
      },
    }
    const jobs = await db
      .insert(generationJobs)
      .values([
        {
          userId: owner,
          snapshotId: snapshot!.id,
          status: 'running',
          idempotencyKey: randomUUID(),
          providerKeyId: outcome.value.id,
          models: plan,
        },
        {
          userId: owner,
          snapshotId: snapshot!.id,
          status: 'queued',
          idempotencyKey: randomUUID(),
          providerKeyId: outcome.value.id,
          models: plan,
        },
        {
          userId: owner,
          snapshotId: snapshot!.id,
          status: 'succeeded',
          idempotencyKey: randomUUID(),
          providerKeyId: outcome.value.id,
          models: plan,
        },
      ])
      .returning({ id: generationJobs.id, status: generationJobs.status })

    await keys.delete(owner, outcome.value.id)

    const after = await db
      .select({
        id: generationJobs.id,
        status: generationJobs.status,
        errorCode: generationJobs.errorCode,
        providerKeyId: generationJobs.providerKeyId,
      })
      .from(generationJobs)
      .where(eq(generationJobs.userId, owner))
    const byId = new Map(after.map((row) => [row.id, row]))
    const running = byId.get(jobs[0]!.id)
    const queued = byId.get(jobs[1]!.id)
    const succeeded = byId.get(jobs[2]!.id)
    expect(running).toMatchObject({
      status: 'failed',
      errorCode: 'KEY_REMOVED',
      providerKeyId: null,
    })
    expect(queued).toMatchObject({ status: 'failed', errorCode: 'KEY_REMOVED' })
    expect(succeeded).toMatchObject({ status: 'succeeded', errorCode: null })
    const sent = await db.select().from(notifications).where(eq(notifications.userId, owner))
    expect(sent.map((n) => n.kind).sort()).toEqual(['job_failed', 'job_failed'])
    expect(await runtime.jobStore.heartbeat(jobs[0]!.id)).toBe('stopped')
  })

  it('stores the default model and rejects a model outside the catalogue', async () => {
    const owner = await seedUser()
    const models = createModelsService({ db, catalog: bundledCatalog() })
    expect(await models.getPreferences(owner)).toEqual({ defaultModel: null })
    expect(await models.setPreferences(owner, { defaultModel: 'claude-haiku-5-5' })).toMatchObject({
      kind: 'ok',
    })
    expect((await models.getPreferences(owner)).defaultModel).toBe('claude-haiku-5-5')
    expect(
      await models.setPreferences(owner, { defaultModel: 'unlisted/model-not-in-catalogue' }),
    ).toEqual({ kind: 'refused', refusal: { modelId: 'unlisted/model-not-in-catalogue' } })
  })
})
