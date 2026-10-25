import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Fastify from 'fastify'
import { inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { notifications } from '../../platform/db/schema'
import type { App } from '../../platform/http'
import { createLogger } from '../../platform/logger'
import { listenOnLoopback, parseSse, stubAuth } from '../../test/sse'
import { createNotificationsService } from './notifications.service'
import { registerNotificationsStream } from './notifications.stream.route'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

describe.skipIf(DATABASE_URL === '')('notifications stream against Postgres', () => {
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
    registerNotificationsStream(app, {
      auth: stubAuth,
      notifications: createNotificationsService(db),
      productOrigin: 'http://localhost:3001',
      pollMs: 20,
      heartbeatMs: 60_000,
      maxStreamsPerUser: 1,
    })
    baseUrl = await listenOnLoopback(app)
  })

  afterAll(async () => {
    await app.close()
    if (seededUsers.length > 0) await db.delete(user).where(inArray(user.id, seededUsers))
    await pool.end()
  })

  const seedUser = async (unread: number, read = 0) => {
    const id = randomUUID()
    seededUsers.push(id)
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    const rows = [
      ...Array.from({ length: unread }, (_, index) => ({
        userId: id,
        kind: 'job_succeeded' as const,
        title: `unread ${index}`,
      })),
      ...Array.from({ length: read }, (_, index) => ({
        userId: id,
        kind: 'job_succeeded' as const,
        title: `read ${index}`,
        readAt: new Date(),
      })),
    ]
    if (rows.length > 0) await db.insert(notifications).values(rows)
    return id
  }

  const open = (headers: Record<string, string>, signal?: AbortSignal) =>
    fetch(`${baseUrl}/notifications/stream`, { headers, signal })

  it('refuses a request without a session', async () => {
    const res = await open({})
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'UNAUTHORIZED' })
  })

  it('pushes the unread count on connect and again when it changes, and ignores read items', async () => {
    const owner = await seedUser(2, 3)
    const controller = new AbortController()
    const res = await open({ 'x-test-user': owner }, controller.signal)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const frames = parseSse(res.body!)[Symbol.asyncIterator]()

    expect((await frames.next()).value).toMatchObject({ event: 'unread', data: { count: 2 } })

    await db.insert(notifications).values({
      userId: owner,
      kind: 'job_failed',
      title: 'new failure',
    })
    expect((await frames.next()).value).toMatchObject({ event: 'unread', data: { count: 3 } })

    controller.abort()
  })

  it('does not push again while the count is unchanged', async () => {
    const owner = await seedUser(1)
    const controller = new AbortController()
    const res = await open({ 'x-test-user': owner }, controller.signal)
    const frames = parseSse(res.body!)[Symbol.asyncIterator]()
    expect((await frames.next()).value).toMatchObject({ data: { count: 1 } })

    const raced = frames.next()
    const settled = await Promise.race([
      raced.then(() => 'pushed' as const),
      new Promise<'quiet'>((resolve) => setTimeout(() => resolve('quiet'), 150)),
    ])
    expect(settled).toBe('quiet')

    controller.abort()
    await raced.catch(() => undefined)
  })

  it('limits open streams per user and frees the slot when a stream closes', async () => {
    const owner = await seedUser(0)
    const controller = new AbortController()
    const first = await open({ 'x-test-user': owner }, controller.signal)
    const frames = parseSse(first.body!)[Symbol.asyncIterator]()
    await frames.next()

    const refused = await open({ 'x-test-user': owner })
    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('60')
    expect(await refused.json()).toMatchObject({ error: 'TOO_MANY_STREAMS' })

    controller.abort()
    let reopened: Response | undefined
    for (let attempt = 0; attempt < 50 && !reopened; attempt++) {
      const candidate = await open({ 'x-test-user': owner })
      if (candidate.status === 200) reopened = candidate
      else await new Promise((resolve) => setTimeout(resolve, 20))
    }
    expect(reopened?.status).toBe(200)
    await reopened?.body?.cancel()
  })
})
