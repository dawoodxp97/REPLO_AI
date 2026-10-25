import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { JobStatus, ModelPlan } from '@replo/contracts'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  jobStages,
  llmCalls,
  operators,
  repoSnapshots,
  repositories,
} from '../../platform/db/schema'
import { createJobHistory } from '../generation/job-history.service'
import { createOperatorService, type OperatorService } from './operator.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const plan: ModelPlan = {
  provider: 'anthropic',
  preset: 'budget',
  pipeline: 'lite',
  models: {
    planner: 'claude-haiku-5-5',
    author: 'claude-haiku-5-5',
    summarizer: null,
    judge: null,
  },
  budgetMicros: 2_000_000,
}

describe.skipIf(DATABASE_URL === '')('operator screen against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let operator: OperatorService
  let snapshotId: string

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    operator = createOperatorService({ db, jobs: createJobHistory(db) })
  })

  afterAll(async () => {
    await pool.end()
  })

  beforeEach(async () => {
    await db.execute(sql`truncate table "user", repositories restart identity cascade`)
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: 9_300_001,
        owner: 'acme',
        name: 'operator',
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({ repositoryId: repo!.id, commitSha: 'f'.repeat(40), analyzerVersion: 1 })
      .returning({ id: repoSnapshots.id })
    snapshotId = snapshot!.id
  })

  const seedUser = async (name = 'Developer') => {
    const id = randomUUID()
    await db.insert(user).values({ id, name, email: `${id}@test.invalid` })
    return id
  }

  const seedOperator = async () => {
    const id = await seedUser('Operator')
    await db.insert(operators).values({ userId: id })
    return id
  }

  const seedJob = async (userId: string, status: JobStatus = 'queued') => {
    const [job] = await db
      .insert(generationJobs)
      .values({
        userId,
        snapshotId,
        kind: 'generate',
        status,
        idempotencyKey: randomUUID(),
        models: plan,
        budgetMicros: plan.budgetMicros,
      })
      .returning({ id: generationJobs.id })
    return job!.id
  }

  it('answers every operator procedure with NOT_FOUND for anyone who is not an operator', async () => {
    const owner = await seedUser()
    const stranger = await seedUser('Stranger')
    const jobId = await seedJob(owner)

    for (const caller of [owner, stranger]) {
      await expect(operator.jobs(caller, { limit: 25 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Operator screen not found',
      })
      await expect(operator.job(caller, jobId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Operator screen not found',
      })
    }
    await expect(operator.job(stranger, randomUUID())).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Operator screen not found',
    })
  })

  it('lists the jobs of every user for an operator', async () => {
    const operatorId = await seedOperator()
    const alice = await seedUser('Alice')
    const bob = await seedUser('Bob')
    const aliceJob = await seedJob(alice)
    const bobJob = await seedJob(bob, 'failed')

    const page = await operator.jobs(operatorId, { limit: 25 })

    expect(page.nextCursor).toBeNull()
    expect(page.items).toHaveLength(2)
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobId: aliceJob,
          userId: alice,
          status: 'queued',
          pipeline: 'lite',
          budgetMicros: 2_000_000,
        }),
        expect.objectContaining({ jobId: bobJob, userId: bob, status: 'failed' }),
      ]),
    )
  })

  it('returns a job with its stages and LLM calls to an operator', async () => {
    const operatorId = await seedOperator()
    const owner = await seedUser()
    const jobId = await seedJob(owner, 'succeeded')
    const finishedAt = new Date('2026-10-22T10:00:05.000Z')
    await db.insert(jobStages).values({
      jobId,
      stage: 'ingest',
      status: 'completed',
      attempt: 1,
      finishedAt,
    })
    await db.insert(llmCalls).values({
      jobId,
      stage: 'planner',
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      inputTokens: 1_000,
      outputTokens: 200,
      costMicros: 4_000,
      latencyMs: 812,
      status: 'ok',
    })

    const detail = await operator.job(operatorId, jobId)

    expect(detail.job).toMatchObject({
      jobId,
      userId: owner,
      status: 'succeeded',
      pipeline: 'lite',
      errorMessage: null,
    })
    expect(detail.stages).toEqual([
      {
        stage: 'ingest',
        status: 'completed',
        attempt: 1,
        finishedAt: finishedAt.toISOString(),
      },
    ])
    expect(detail.llmCalls).toEqual([
      expect.objectContaining({
        stage: 'planner',
        provider: 'anthropic',
        model: 'claude-haiku-5-5',
        inputTokens: 1_000,
        outputTokens: 200,
        costMicros: 4_000,
        latencyMs: 812,
        status: 'ok',
      }),
    ])
  })

  it('reports an unknown job id as not found to an operator', async () => {
    const operatorId = await seedOperator()

    await expect(operator.job(operatorId, randomUUID())).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Job not found',
    })
  })

  it('filters the list by status', async () => {
    const operatorId = await seedOperator()
    const owner = await seedUser()
    const failedJob = await seedJob(owner, 'failed')
    await seedJob(owner, 'queued')
    await seedJob(owner, 'succeeded')

    const page = await operator.jobs(operatorId, { status: 'failed', limit: 25 })

    expect(page).toEqual({
      items: [expect.objectContaining({ jobId: failedJob, status: 'failed' })],
      nextCursor: null,
    })
  })

  it('pages with a decimal offset cursor and stops on a short page', async () => {
    const operatorId = await seedOperator()
    const owner = await seedUser()
    const jobIds = [
      await seedJob(owner),
      await seedJob(owner),
      await seedJob(owner),
      await seedJob(owner),
      await seedJob(owner),
    ]

    const first = await operator.jobs(operatorId, { limit: 2 })
    expect(first.items).toHaveLength(2)
    expect(first.nextCursor).toBe('2')

    const second = await operator.jobs(operatorId, { limit: 2, cursor: '2' })
    expect(second.items).toHaveLength(2)
    expect(second.nextCursor).toBe('4')

    const third = await operator.jobs(operatorId, { limit: 2, cursor: '4' })
    expect(third.items).toHaveLength(1)
    expect(third.nextCursor).toBeNull()

    const seen = [...first.items, ...second.items, ...third.items].map((row) => row.jobId)
    expect(seen).toHaveLength(jobIds.length)
    expect(new Set(seen)).toEqual(new Set(jobIds))
  })
})
