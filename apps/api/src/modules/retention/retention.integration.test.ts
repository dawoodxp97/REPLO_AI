import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inArray, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ModelPlan } from '@replo/contracts'
import { DEFAULT_EXTRACTION_LIMITS, ANALYZER_VERSION } from '@replo/repo-analysis'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  jobEvents,
  jobStageOutputs,
  notifications,
  repositories,
  repoSnapshots,
  tutorialVersions,
  tutorials,
} from '../../platform/db/schema'
import type { GithubRest } from '../../platform/github/client'
import { createJobHistory } from '../generation/job-history.service'
import { createIndexingService } from '../indexing/indexing.service'
import { createNotificationsService } from '../notifications/notifications.service'
import { createStageOutputs } from '../pipeline/outputs'
import { createRetentionService } from './retention.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2026-10-22T12:00:00.000Z')
const daysBefore = (days: number) => new Date(NOW.getTime() - days * DAY)

const models: ModelPlan = {
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

describe.skipIf(DATABASE_URL === '')('retention against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let snapshotRoot: string

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table "user", repositories restart identity cascade`)
    snapshotRoot = await mkdtemp(join(tmpdir(), 'replo-retention-'))
  })

  afterAll(async () => {
    await rm(snapshotRoot, { recursive: true, force: true })
    await pool.end()
  })

  const unusedRest = {
    request: async () => {
      throw new Error('network is off in tests')
    },
  } as unknown as GithubRest

  const seedSnapshot = async (repositoryId: string, createdAt: Date) => {
    const [row] = await db
      .insert(repoSnapshots)
      .values({
        repositoryId,
        commitSha: randomUUID().replace(/-/g, '').padEnd(40, 'a').slice(0, 40),
        analyzerVersion: ANALYZER_VERSION,
        status: 'ready',
        createdAt,
      })
      .returning({ id: repoSnapshots.id })
    if (!row) throw new Error('snapshot seed failed')
    await mkdir(join(snapshotRoot, row.id), { recursive: true })
    await writeFile(join(snapshotRoot, row.id, 'index.ts'), 'export {}\n')
    return row.id
  }

  const seedJob = async (
    userId: string,
    snapshotId: string,
    status: 'succeeded' | 'failed',
    finishedAt: Date,
  ) => {
    const [row] = await db
      .insert(generationJobs)
      .values({
        userId,
        snapshotId,
        kind: 'generate',
        status,
        audience: 'intermediate',
        idempotencyKey: randomUUID(),
        models,
        budgetMicros: 2_000_000,
        finishedAt,
      })
      .returning({ id: generationJobs.id })
    if (!row) throw new Error('job seed failed')
    await createStageOutputs(db).write(row.id, 'outline', 'all', { title: 'kept?' })
    return row.id
  }

  it('purges finished-job checkpoints, old events and unreferenced snapshots and keeps live references', async () => {
    const owner = randomUUID()
    await db.insert(user).values({ id: owner, name: 'Developer', email: `${owner}@test.invalid` })
    const [repository] = await db
      .insert(repositories)
      .values({
        githubRepoId: Math.floor(Math.random() * 1_000_000_000) + 1,
        owner: 'acme',
        name: 'shop',
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!repository) throw new Error('repository seed failed')

    const indexing = createIndexingService({
      db,
      rest: unusedRest,
      tokens: { installationToken: async () => undefined },
      sources: { ingestSource: async () => undefined },
      limits: { maxFiles: 5000, maxBytes: 50_000_000 },
      extraction: DEFAULT_EXTRACTION_LIMITS,
      snapshotRoot,
    })
    const jobs = createJobHistory(db)

    const orphan = await seedSnapshot(repository.id, daysBefore(3))
    const referencedByJob = await seedSnapshot(repository.id, daysBefore(3))
    const referencedByVersion = await seedSnapshot(repository.id, daysBefore(3))
    const recent = await seedSnapshot(repository.id, daysBefore(0))

    const succeeded = await seedJob(owner, referencedByJob, 'succeeded', daysBefore(2))
    const failed = await seedJob(owner, referencedByJob, 'failed', daysBefore(2))
    const freshFailure = await seedJob(owner, recent, 'failed', daysBefore(1))

    const [tutorial] = await db
      .insert(tutorials)
      .values({
        userId: owner,
        repositoryId: repository.id,
        slug: 'shop',
        title: 'Kept tutorial',
      })
      .returning({ id: tutorials.id })
    if (!tutorial) throw new Error('tutorial seed failed')
    await db.insert(tutorialVersions).values({
      tutorialId: tutorial.id,
      versionNo: 1,
      snapshotId: referencedByVersion,
      schemaVersion: 1,
      status: 'published',
      audience: 'intermediate',
      content: null,
      generator: {
        pipeline: 'lite',
        pipelineVersion: 1,
        analyzerVersion: 1,
        models: {},
        promptVersions: {},
        promptHashes: {},
        budgetMicros: 0,
        spentMicros: 0,
      },
    })

    await db.insert(jobEvents).values([
      { jobId: succeeded, type: 'queued', at: daysBefore(120) },
      { jobId: succeeded, type: 'succeeded', at: daysBefore(2) },
    ])

    const [staleNote, freshNote] = await db
      .insert(notifications)
      .values([
        { userId: owner, kind: 'job_succeeded', title: 'stale', createdAt: daysBefore(120) },
        { userId: owner, kind: 'job_succeeded', title: 'fresh', createdAt: daysBefore(2) },
      ])
      .returning({ id: notifications.id })
    if (!staleNote || !freshNote) throw new Error('notification seed failed')

    const retention = createRetentionService({
      jobs,
      pipeline: { purgeOutputs: (ids) => createStageOutputs(db).clearForJobs(ids) },
      indexing,
      notifications: createNotificationsService(db),
    })
    const report = await retention.run(NOW)

    expect(report.finishedJobs).toBe(1)
    expect(report.snapshotsPurged).toBe(1)
    expect(report.notificationsPurged).toBeGreaterThanOrEqual(1)

    const remainingNotes = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(inArray(notifications.id, [staleNote.id, freshNote.id]))
    expect(remainingNotes.map((row) => row.id)).toEqual([freshNote.id])

    const outputs = await db.select({ jobId: jobStageOutputs.jobId }).from(jobStageOutputs)
    expect(outputs.map((row) => row.jobId).sort()).toEqual([failed, freshFailure].sort())

    const events = await db.select({ type: jobEvents.type }).from(jobEvents)
    expect(events.map((row) => row.type)).toEqual(['succeeded'])

    const snapshots = await db.select({ id: repoSnapshots.id }).from(repoSnapshots)
    expect(snapshots.map((row) => row.id).sort()).toEqual(
      [referencedByJob, referencedByVersion, recent].sort(),
    )
    await expect(stat(join(snapshotRoot, orphan))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(stat(join(snapshotRoot, referencedByJob))).resolves.toBeDefined()
  })
})
