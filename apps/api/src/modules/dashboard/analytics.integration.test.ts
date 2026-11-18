import { randomUUID } from 'node:crypto'
import { inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { analyticsEvents } from '../../platform/db/schema'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { applyDdl } from '../../platform/db/test-setup'
import { AnalyticsQuery } from '@replo/contracts'
import { createAnalyticsService, type AnalyticsService } from './analytics.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const QUERY = AnalyticsQuery.parse({
  from: '2026-11-01',
  to: '2026-11-30',
  granularity: 'day',
  tz: 'UTC',
  filters: {},
})

describe.skipIf(DATABASE_URL === '')('analytics against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let analytics: AnalyticsService
  const seeded: string[] = []

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await applyDdl(pool)
    analytics = createAnalyticsService(db)
  })

  afterAll(async () => {
    if (seeded.length > 0) await db.delete(users).where(inArray(users.id, seeded))
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    seeded.push(id)
    await db.insert(users).values({ id, name: 'Analyst', email: `${id}@test.invalid` })
    return id
  }

  it('reports success rate, time to ready and model usage', async () => {
    const owner = await seedUser()
    await db.insert(analyticsEvents).values([
      event(owner, 'job_succeeded', '2026-11-02T10:00:00.000Z', {
        model: 'model-a',
        durationMs: 600_000,
      }),
      event(owner, 'job_succeeded', '2026-11-03T10:00:00.000Z', {
        model: 'model-a',
        durationMs: 900_000,
      }),
      event(owner, 'job_succeeded', '2026-11-03T11:00:00.000Z', {
        model: 'model-b',
        durationMs: 1_200_000,
      }),
      event(owner, 'job_failed', '2026-11-04T10:00:00.000Z', {
        model: 'model-b',
        durationMs: 300_000,
        code: 'STAGE_FAILED',
      }),
      event(owner, 'lesson_completed', '2026-11-04T12:00:00.000Z'),
      event(owner, 'quiz_submitted', '2026-11-04T12:05:00.000Z', { correct: true }),
    ])

    const report = await analytics.report(owner, QUERY)
    expect(report.summary).toEqual({
      jobsSucceeded: 3,
      jobsFailed: 1,
      successRate: 0.75,
      medianTimeToReadySeconds: 900,
    })
    expect(report.models).toEqual([
      { model: 'model-a', generations: 2 },
      { model: 'model-b', generations: 2 },
    ])
    expect(report.series.find((series) => series.key === 'lesson_completed')?.points).toEqual([
      { bucket: '2026-11-04', value: 1 },
    ])
  })

  it('keeps events outside the caller range out of the report', async () => {
    const owner = await seedUser()
    await db.insert(analyticsEvents).values([
      event(owner, 'job_succeeded', '2026-10-31T23:59:59.000Z', {
        model: 'model-a',
        durationMs: 10_000,
      }),
      event(owner, 'job_succeeded', '2026-12-01T00:00:00.000Z', {
        model: 'model-a',
        durationMs: 10_000,
      }),
    ])

    const report = await analytics.report(owner, QUERY)
    expect(report.summary.jobsSucceeded).toBe(0)
    expect(report.series).toEqual([])
    expect(report.models).toEqual([])
  })

  it('saves, lists, finds in search and deletes a named dashboard', async () => {
    const owner = await seedUser()
    const saved = await analytics.save(owner, { name: 'November', query: QUERY })
    expect(saved.name).toBe('November')

    expect((await analytics.list(owner, { limit: 10 })).items.map((item) => item.id)).toEqual([
      saved.id,
    ])
    expect(await analytics.searchOwn(owner, 'Nov', 10)).toEqual([
      { dashboardId: saved.id, name: 'November' },
    ])

    await analytics.remove(owner, saved.id)
    expect((await analytics.list(owner, { limit: 10 })).items).toEqual([])
  })

  it('refuses a duplicate dashboard name for the same user', async () => {
    const owner = await seedUser()
    await analytics.save(owner, { name: 'November', query: QUERY })
    await expect(analytics.save(owner, { name: 'November', query: QUERY })).rejects.toMatchObject({
      code: 'DASHBOARD_NAME_TAKEN',
    })
  })
})

function event(
  userId: string,
  type: string,
  occurredAt: string,
  metadata?: Record<string, unknown>,
) {
  return {
    userId,
    type,
    occurredAt: new Date(occurredAt),
    ...(metadata === undefined ? {} : { metadata }),
  }
}
