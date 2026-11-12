import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { inArray, sql, type SQL } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { notifications } from '../../platform/db/schema'
import { decodeCursor } from './notifications.cursor'
import { createNotificationsService, type NotificationsService } from './notifications.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

interface Seed {
  title: string
  createdAt?: Date | SQL
  readAt?: Date
}

describe.skipIf(DATABASE_URL === '')('notifications against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let notes: NotificationsService
  const seeded: string[] = []

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    notes = createNotificationsService(db)
  })

  afterAll(async () => {
    if (seeded.length > 0) await db.delete(users).where(inArray(users.id, seeded))
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    seeded.push(id)
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seed = (userId: string, rows: Seed[]) =>
    db
      .insert(notifications)
      .values(
        rows.map((row) => ({
          userId,
          kind: 'job_succeeded' as const,
          title: row.title,
          createdAt: row.createdAt,
          readAt: row.readAt,
        })),
      )
      .returning({ id: notifications.id })

  it('lists newest first with id breaking ties, and pages through every row once', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [
      { title: 'oldest', createdAt: new Date('2026-10-01T10:00:00.000Z') },
      { title: 'tie', createdAt: new Date('2026-10-01T10:00:01.000Z') },
      { title: 'tie', createdAt: new Date('2026-10-01T10:00:01.000Z') },
      { title: 'newest', createdAt: new Date('2026-10-01T10:00:02.000Z') },
    ])
    const id = (index: number) => inserted[index]!.id
    const tied = [id(1), id(2)].sort().reverse()

    const firstPage = await notes.list(owner, { limit: 2 })
    expect(firstPage.items.map((item) => item.id)).toEqual([id(3), tied[0]])
    expect(firstPage.items[0]).toEqual({
      id: id(3),
      kind: 'job_succeeded',
      title: 'newest',
      body: null,
      link: null,
      jobId: null,
      readAt: null,
      createdAt: '2026-10-01T10:00:02.000Z',
    })
    expect(decodeCursor(firstPage.nextCursor ?? '')?.id).toBe(tied[0])

    const secondPage = await notes.list(owner, {
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    })
    expect(secondPage.items.map((item) => item.id)).toEqual([tied[1], id(0)])
    expect(secondPage.nextCursor).toBeNull()
  })

  it('pages rows that share a millisecond without skipping or repeating any', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [
      { title: 'first', createdAt: sql`timestamptz '2026-10-01 10:00:00.000000+00'` },
      { title: 'second', createdAt: sql`timestamptz '2026-10-01 10:00:00.000001+00'` },
      { title: 'third', createdAt: sql`timestamptz '2026-10-01 10:00:00.000002+00'` },
    ])
    const id = (index: number) => inserted[index]!.id

    const first = await notes.list(owner, { limit: 1 })
    expect(first.items.map((item) => item.id)).toEqual([id(2)])
    const second = await notes.list(owner, { limit: 1, cursor: first.nextCursor ?? undefined })
    expect(second.items.map((item) => item.id)).toEqual([id(1)])
    const third = await notes.list(owner, { limit: 1, cursor: second.nextCursor ?? undefined })
    expect(third.items.map((item) => item.id)).toEqual([id(0)])
    expect(third.nextCursor).toBeNull()
  })

  it('keeps paging after the notification the cursor points at was deleted', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [
      { title: 'a', createdAt: new Date('2026-10-01T10:00:00.000Z') },
      { title: 'b', createdAt: new Date('2026-10-01T10:00:01.000Z') },
      { title: 'c', createdAt: new Date('2026-10-01T10:00:02.000Z') },
      { title: 'd', createdAt: new Date('2026-10-01T10:00:03.000Z') },
    ])
    const id = (index: number) => inserted[index]!.id

    const first = await notes.list(owner, { limit: 2 })
    expect(first.items.map((item) => item.id)).toEqual([id(3), id(2)])
    await notes.delete(owner, id(2))

    const second = await notes.list(owner, { limit: 2, cursor: first.nextCursor ?? undefined })
    expect(second.items.map((item) => item.id)).toEqual([id(1), id(0)])
    expect(second.nextCursor).toBeNull()
  })

  it('pages past a purged cursor row without repeating or skipping later rows', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [
      { title: 'old', createdAt: sql`timestamptz '2026-10-01 10:00:00.000001+00'` },
      { title: 'mid', createdAt: sql`timestamptz '2026-10-01 10:00:00.000002+00'` },
      { title: 'new', createdAt: sql`timestamptz '2026-10-01 10:00:00.000003+00'` },
    ])
    const first = await notes.list(owner, { limit: 1 })
    expect(first.items.map((item) => item.id)).toEqual([inserted[2]!.id])
    await notes.delete(owner, inserted[2]!.id)
    const second = await notes.list(owner, { limit: 5, cursor: first.nextCursor ?? undefined })
    expect(second.items.map((item) => item.id)).toEqual([inserted[1]!.id, inserted[0]!.id])
  })

  it('rejects a cursor that was not issued by this endpoint as a bad request', async () => {
    const owner = await seedUser()
    await expect(notes.list(owner, { limit: 5, cursor: randomUUID() })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    await expect(notes.list(owner, { limit: 5, cursor: 'bm90LWpzb24' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
    const forged = Buffer.from(JSON.stringify({ at: 'tomorrow', id: randomUUID() })).toString(
      'base64url',
    )
    await expect(notes.list(owner, { limit: 5, cursor: forged })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('never exposes another user rows through a cursor taken from their listing', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    await seed(owner, [{ title: 'mine', createdAt: new Date('2026-10-01T10:00:00.000Z') }])
    await seed(stranger, [
      { title: 'theirs 1', createdAt: new Date('2026-10-01T11:00:00.000Z') },
      { title: 'theirs 2', createdAt: new Date('2026-10-01T12:00:00.000Z') },
    ])
    const theirs = await notes.list(stranger, { limit: 1 })
    const viaOwner = await notes.list(owner, { limit: 10, cursor: theirs.nextCursor ?? undefined })
    expect(viaOwner.items.map((item) => item.title)).toEqual(['mine'])
  })

  it('counts only the caller unread notifications', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    await seed(owner, [{ title: 'a' }, { title: 'b' }, { title: 'c', readAt: new Date() }])
    await seed(stranger, [{ title: 'x' }, { title: 'y' }, { title: 'z' }])
    expect(await notes.unreadCount(owner)).toEqual({ count: 2 })
    expect(await notes.unreadCount(stranger)).toEqual({ count: 3 })
  })

  it('marks a notification read once and returns it unchanged on repeat', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [{ title: 'build finished' }])
    const id = inserted[0]!.id

    const first = await notes.markRead(owner, id)
    expect(first).toMatchObject({ id, title: 'build finished' })
    expect(first.readAt).not.toBeNull()
    expect(await notes.markRead(owner, id)).toEqual(first)
    expect(await notes.unreadCount(owner)).toEqual({ count: 0 })
  })

  it('reports marking a foreign or missing notification as not found and leaves it unread', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const theirs = await seed(stranger, [{ title: 'theirs' }])
    await expect(notes.markRead(owner, theirs[0]!.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(notes.markRead(owner, randomUUID())).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await notes.unreadCount(stranger)).toEqual({ count: 1 })
  })

  it('marks all unread notifications of the caller and returns how many changed', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    await seed(owner, [
      { title: 'a' },
      { title: 'b' },
      { title: 'c' },
      { title: 'd', readAt: new Date() },
    ])
    await seed(stranger, [{ title: 'x' }, { title: 'y' }])
    expect(await notes.markAllRead(owner)).toEqual({ updated: 3 })
    expect(await notes.unreadCount(owner)).toEqual({ count: 0 })
    expect(await notes.unreadCount(stranger)).toEqual({ count: 2 })
    expect(await notes.markAllRead(owner)).toEqual({ updated: 0 })
  })

  it('deletes a notification for its owner, after which it is gone', async () => {
    const owner = await seedUser()
    const inserted = await seed(owner, [{ title: 'gone soon' }])
    const id = inserted[0]!.id

    await notes.delete(owner, id)
    expect((await notes.list(owner, { limit: 10 })).items).toEqual([])
    await expect(notes.delete(owner, id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(notes.markRead(owner, id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('reports deleting a foreign notification as not found and keeps it', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const theirs = await seed(stranger, [{ title: 'theirs' }])
    await expect(notes.delete(owner, theirs[0]!.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await notes.unreadCount(stranger)).toEqual({ count: 1 })
  })
})
