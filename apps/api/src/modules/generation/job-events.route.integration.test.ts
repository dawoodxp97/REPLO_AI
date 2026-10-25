import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ModelPlan } from '@replo/contracts'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { generationJobs, jobEvents, repoSnapshots, repositories } from '../../platform/db/schema'
import type { App } from '../../platform/http'
import { createLogger } from '../../platform/logger'
import { listenOnLoopback, parseSse, stubAuth, type ParsedFrame } from '../../test/sse'
import { registerJobEventsRoute } from './job-events.route'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const ORIGIN = 'http://localhost:3001'

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

describe.skipIf(DATABASE_URL === '')('job events stream against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let app: App
  let baseUrl: string
  const seededUsers: string[] = []

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    app = Fastify({ loggerInstance: createLogger({ level: 'silent', name: 'test' }) })
    registerJobEventsRoute(app, {
      db,
      auth: stubAuth,
      productOrigin: ORIGIN,
      pollMs: 20,
      heartbeatMs: 60_000,
    })
    baseUrl = await listenOnLoopback(app)
  })

  afterAll(async () => {
    await app.close()
    if (seededUsers.length > 0) await db.delete(user).where(inArray(user.id, seededUsers))
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    seededUsers.push(id)
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedJob = async (owner: string, status: 'running' | 'succeeded') => {
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
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({
        repositoryId: repository!.id,
        commitSha: 'a'.repeat(40),
        analyzerVersion: ANALYZER_VERSION,
        status: 'ready',
      })
      .returning({ id: repoSnapshots.id })
    const [job] = await db
      .insert(generationJobs)
      .values({
        userId: owner,
        snapshotId: snapshot!.id,
        kind: 'generate',
        status,
        audience: 'intermediate',
        idempotencyKey: randomUUID(),
        models,
        budgetMicros: 2_000_000,
      })
      .returning({ id: generationJobs.id })
    return job!.id
  }

  const addEvent = async (jobId: string, type: typeof jobEvents.$inferInsert.type) => {
    const [row] = await db.insert(jobEvents).values({ jobId, type }).returning({ id: jobEvents.id })
    return row!.id
  }

  const open = (jobId: string, headers: Record<string, string>) =>
    fetch(`${baseUrl}/jobs/${jobId}/events`, { headers })

  it('answers 404 without a session and for another user’s job', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const jobId = await seedJob(owner, 'running')

    expect((await open(jobId, {})).status).toBe(404)
    expect((await open(jobId, { 'x-test-user': stranger })).status).toBe(404)
    expect((await open('not-a-uuid', { 'x-test-user': owner })).status).toBe(404)
  })

  it('replays only the events after Last-Event-ID and closes at a terminal status', async () => {
    const owner = await seedUser()
    const jobId = await seedJob(owner, 'succeeded')
    const first = await addEvent(jobId, 'queued')
    await addEvent(jobId, 'stage_started')
    await addEvent(jobId, 'stage_completed')
    await addEvent(jobId, 'succeeded')

    const res = await open(jobId, { 'x-test-user': owner, 'last-event-id': String(first) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const frames = parseSse(res.body!)
    const received: ParsedFrame[] = []
    for await (const frame of frames) received.push(frame)

    expect(received.map((frame) => frame.event)).toEqual([
      'stage_started',
      'stage_completed',
      'succeeded',
    ])
    expect(received.map((frame) => frame.id)).toEqual(
      received.map((frame) => (frame.data as { id: number }).id).map(String),
    )
    expect((received[0]!.data as { jobId: string }).jobId).toBe(jobId)
  })

  it('pushes events as they arrive and stops when the job finishes', async () => {
    const owner = await seedUser()
    const jobId = await seedJob(owner, 'running')
    await addEvent(jobId, 'queued')

    const res = await open(jobId, { 'x-test-user': owner })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    const frames = parseSse(res.body!)[Symbol.asyncIterator]()

    expect((await frames.next()).value).toMatchObject({ event: 'queued' })

    await addEvent(jobId, 'stage_started')
    expect((await frames.next()).value).toMatchObject({ event: 'stage_started' })

    await addEvent(jobId, 'succeeded')
    await db.update(generationJobs).set({ status: 'succeeded' }).where(eq(generationJobs.id, jobId))
    expect((await frames.next()).value).toMatchObject({ event: 'succeeded' })
    expect((await frames.next()).done).toBe(true)
  })

  it('answers the product origin with credentialed CORS headers', async () => {
    const owner = await seedUser()
    const jobId = await seedJob(owner, 'succeeded')
    await addEvent(jobId, 'succeeded')

    const res = await fetch(`${baseUrl}/jobs/${jobId}/events`, {
      headers: { 'x-test-user': owner, origin: ORIGIN },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN)
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
    await res.body?.cancel()
  })
})
