import { and, count, eq, gte, sql } from 'drizzle-orm'
import type { AnalyticsQuery, AnalyticsSeries } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { analyticsEvents } from '../../platform/db/schema'

const TRUNC = { day: 'day', week: 'week', month: 'month' } as const

export interface AnalyticsEventInput {
  userId: string
  type: string
  subjectType?: string | null
  subjectId?: string | null
  metadata?: Record<string, unknown> | null
}

export const analyticsRepo = (db: Db) => ({
  async record(input: AnalyticsEventInput): Promise<void> {
    await db.insert(analyticsEvents).values({
      userId: input.userId,
      type: input.type,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId ?? null,
      metadata: input.metadata ?? null,
    })
  },

  async series(
    userId: string,
    query: AnalyticsQuery,
    key: string,
    label: string,
  ): Promise<AnalyticsSeries> {
    const trunc = TRUNC[query.granularity]
    const bucket = sql<string>`to_char(date_trunc(${trunc}, ${analyticsEvents.occurredAt} at time zone ${query.tz}), 'YYYY-MM-DD')`
    const rows = await db
      .select({ bucket, value: count() })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.userId, userId),
          eq(analyticsEvents.type, key),
          gte(analyticsEvents.occurredAt, new Date(`${query.from}T00:00:00.000Z`)),
        ),
      )
      .groupBy(bucket)
      .orderBy(bucket)
    return { key, label, points: rows.map((row) => ({ bucket: row.bucket, value: row.value })) }
  },
})