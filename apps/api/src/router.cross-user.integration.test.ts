import { randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRouterClient, ORPCError } from '@orpc/server'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ModelPlan } from '@replo/contracts'
import { user } from './platform/db/auth-schema'
import { createDb, type Db } from './platform/db/client'
import {
  generationJobs,
  learningProgress,
  notifications,
  providerKeys,
  repoSnapshots,
  repositories,
  tutorials,
  tutorialVersions,
  userRepositories,
} from './platform/db/schema'
import { loadConfig } from './platform/config'
import type { JobQueue } from './platform/queue/job-queue'
import { createDomainServices, createServices } from './composition'
import type { RequestContext, SessionUser } from './context'
import { router } from './router'
import { stubAuth } from './test/sse'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const models: ModelPlan = {
  provider: 'openrouter',
  preset: 'budget',
  pipeline: 'lite',
  models: {
    planner: 'anthropic/claude-haiku-5-5',
    author: 'anthropic/claude-haiku-5-5',
    summarizer: null,
    judge: null,
  },
  budgetMicros: 2_000_000,
}

const generator = {
  pipeline: 'lite' as const,
  pipelineVersion: 1,
  analyzerVersion: ANALYZER_VERSION,
  models: {
    planner: 'anthropic/claude-haiku-5-5',
    author: 'anthropic/claude-haiku-5-5',
    summarizer: null,
    judge: null,
  },
  promptVersions: {},
  promptHashes: {},
  budgetMicros: 2_000_000,
  spentMicros: 0,
}

const unusedQueue: JobQueue = { send: async () => null }

describe.skipIf(DATABASE_URL === '')('cross-user isolation across every procedure', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let services: RequestContext['services']
  const seededUsers: string[] = []

  const sessionUser = async (): Promise<SessionUser> => {
    const id = randomUUID()
    seededUsers.push(id)
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return { id, name: 'Developer', email: `${id}@test.invalid`, image: null }
  }

  const clientFor = (session: SessionUser | null) =>
    createRouterClient(router, {
      context: { user: session, services, idempotencyKey: undefined, requestId: randomUUID() },
    })

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    })
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL,
      BETTER_AUTH_SECRET: 'x'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:4000',
      PRODUCT_ORIGIN: 'http://localhost:3001',
      KEY_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    })
    const domain = createDomainServices({ config, db, queue: unusedQueue })
    services = createServices({ db, auth: stubAuth, domain })
  })

  afterAll(async () => {
    if (seededUsers.length > 0) await db.delete(user).where(inArray(user.id, seededUsers))
    await pool.end()
  })

  it('lets the owner read their own job, so the fixtures below are real records', async () => {
    const owner = await sessionUser()
    const world = await seedWorld(owner.id)
    await expect(clientFor(owner).jobs.get({ jobId: world.jobId })).resolves.toMatchObject({
      jobId: world.jobId,
    })
    await expect(clientFor(owner).repositories.list({ limit: 25 })).resolves.toMatchObject({
      items: [expect.objectContaining({ repositoryId: world.repositoryId })],
    })
  })

  it('answers NOT_FOUND to another user for every procedure that names a record', async () => {
    const owner = await sessionUser()
    const stranger = clientFor(await sessionUser())
    const world = await seedWorld(owner.id)
    const adminOnly = clientFor(await sessionUser())

    const probes: Array<[string, () => Promise<unknown>]> = [
      ['jobs.get', () => stranger.jobs.get({ jobId: world.jobId })],
      ['jobs.cancel', () => stranger.jobs.cancel({ jobId: world.jobId })],
      ['jobs.retry', () => stranger.jobs.retry({ jobId: world.jobId })],
      ['keys.validate', () => stranger.keys.validate({ keyId: world.keyId })],
      ['keys.delete', () => stranger.keys.delete({ keyId: world.keyId })],
      ['notifications.markRead', () => stranger.notifications.markRead({ id: world.noteId })],
      ['notifications.delete', () => stranger.notifications.delete({ id: world.noteId })],
      [
        'notifications.list (foreign cursor)',
        () => stranger.notifications.list({ limit: 25, cursor: world.noteId }),
      ],
      [
        'tutorials.get',
        () => stranger.tutorials.get({ owner: 'acme', repo: 'shop', slug: 'shop' }),
      ],
      [
        'tutorials.getChapter',
        () =>
          stranger.tutorials.getChapter({ versionId: world.versionId, chapterKey: 'orientation' }),
      ],
      [
        'tutorials.getSource',
        () => stranger.tutorials.getSource({ versionId: world.versionId, path: 'src/cart.ts' }),
      ],
      ['tutorials.sourceTree', () => stranger.tutorials.sourceTree({ versionId: world.versionId })],
      [
        'tutorials.setVisibility',
        () =>
          stranger.tutorials.setVisibility({ tutorialId: world.tutorialId, visibility: 'public' }),
      ],
      [
        'tutorials.createShareLink',
        () => stranger.tutorials.createShareLink({ tutorialId: world.tutorialId }),
      ],
      [
        'tutorials.report',
        () => stranger.tutorials.report({ tutorialId: world.tutorialId, reason: 'spam' }),
      ],
      ['tutorials.delete', () => stranger.tutorials.delete({ tutorialId: world.tutorialId })],
      [
        'learning.getProgress',
        () => stranger.learning.getProgress({ tutorialId: world.tutorialId }),
      ],
      [
        'learning.history',
        () => stranger.learning.history({ limit: 25, tutorialId: world.tutorialId }),
      ],
      [
        'learning.markLesson',
        () =>
          stranger.learning.markLesson({
            versionId: world.versionId,
            lessonKey: 'map',
            status: 'completed',
          }),
      ],
      [
        'learning.unmarkLesson',
        () => stranger.learning.unmarkLesson({ versionId: world.versionId, lessonKey: 'map' }),
      ],
      [
        'learning.submitQuiz',
        () =>
          stranger.learning.submitQuiz({
            versionId: world.versionId,
            lessonKey: 'map',
            questionKey: 'memory',
            choiceKey: 'a',
          }),
      ],
      [
        'repositories.remove',
        () => stranger.repositories.remove({ repositoryId: world.repositoryId }),
      ],
      ['operator.jobs (not an operator)', () => adminOnly.operator.jobs({ limit: 25 })],
      ['operator.job (not an operator)', () => adminOnly.operator.job({ jobId: world.jobId })],
    ]

    const misses: string[] = []
    for (const [name, call] of probes) {
      const code = await call().then(
        () => 'resolved',
        (error: unknown) => (error instanceof ORPCError ? error.code : String(error)),
      )
      if (code !== 'NOT_FOUND') misses.push(`${name}: ${code}`)
    }
    expect(misses).toEqual([])
  })

  it('keeps the owner’s rows out of every listing and search a stranger can run', async () => {
    const owner = await sessionUser()
    const strangerSession = await sessionUser()
    const stranger = clientFor(strangerSession)
    const world = await seedWorld(owner.id)
    const leaked = [
      world.repositoryId,
      world.tutorialId,
      world.jobId,
      world.keyId,
      world.noteId,
      world.versionId,
    ]

    const listings = await Promise.all([
      stranger.repositories.list({ limit: 25 }),
      stranger.tutorials.list({ limit: 25 }),
      stranger.keys.list(),
      stranger.notifications.list({ limit: 25 }),
      stranger.notifications.unreadCount(),
      stranger.search.own({ q: 'shop', limit: 10 }),
      stranger.dashboard.summary({ tz: 'UTC' }),
      stranger.dashboard.recent({ limit: 25, tz: 'UTC' }),
      stranger.settings.get(),
      stranger.models.getPreferences(),
      stranger.me.get(),
    ])

    for (const listing of listings) {
      const serialised = JSON.stringify(listing)
      for (const id of leaked) expect(serialised).not.toContain(id)
    }
  })

  it('refuses every procedure without a session with UNAUTHORIZED', async () => {
    const world = await seedWorld((await sessionUser()).id)
    const anonymous = clientFor(null)
    await expect(anonymous.jobs.get({ jobId: world.jobId })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    await expect(anonymous.keys.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
    await expect(anonymous.notifications.list({ limit: 25 })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
    await expect(
      anonymous.tutorials.setVisibility({ tutorialId: world.tutorialId, visibility: 'public' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  async function seedWorld(ownerId: string) {
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
    const repositoryId = repository!.id
    await db.insert(userRepositories).values({ userId: ownerId, repositoryId })

    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({
        repositoryId,
        commitSha: 'b'.repeat(40),
        analyzerVersion: ANALYZER_VERSION,
        status: 'ready',
      })
      .returning({ id: repoSnapshots.id })
    const snapshotId = snapshot!.id

    const [job] = await db
      .insert(generationJobs)
      .values({
        userId: ownerId,
        snapshotId,
        kind: 'generate',
        status: 'succeeded',
        audience: 'intermediate',
        idempotencyKey: randomUUID(),
        models,
        budgetMicros: 2_000_000,
      })
      .returning({ id: generationJobs.id })
    const jobId = job!.id

    const [tutorial] = await db
      .insert(tutorials)
      .values({ userId: ownerId, repositoryId, slug: 'shop', title: 'Shop walkthrough' })
      .returning({ id: tutorials.id })
    const tutorialId = tutorial!.id

    const [version] = await db
      .insert(tutorialVersions)
      .values({
        tutorialId,
        versionNo: 1,
        snapshotId,
        schemaVersion: 1,
        status: 'published',
        audience: 'intermediate',
        content: null,
        generator,
        generationJobId: jobId,
      })
      .returning({ id: tutorialVersions.id })
    const versionId = version!.id

    await db.insert(learningProgress).values({
      userId: ownerId,
      tutorialId,
      versionId,
      lessonKey: 'map',
      status: 'in_progress',
    })

    const [key] = await db
      .insert(providerKeys)
      .values({
        userId: ownerId,
        provider: 'openrouter',
        label: 'default',
        ciphertext: 'c2VjcmV0',
        iv: 'aXY=',
        keyVersion: 1,
        last4: '1234',
      })
      .returning({ id: providerKeys.id })
    const keyId = key!.id

    const [note] = await db
      .insert(notifications)
      .values({ userId: ownerId, kind: 'job_succeeded', title: 'Tutorial ready', jobId })
      .returning({ id: notifications.id })
    const noteId = note!.id

    return { repositoryId, jobId, tutorialId, versionId, keyId, noteId }
  }
})
