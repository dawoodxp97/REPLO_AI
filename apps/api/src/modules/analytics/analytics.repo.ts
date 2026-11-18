import { and, count, desc, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import type {
  AnalyticsModelUse,
  AnalyticsQuery,
  AnalyticsSeries,
  AnalyticsSummary,
} from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import { analyticsEvents } from '../../platform/db/schema'

const TRUNC = { day: 'day', week: 'week', month: 'month' } as const
const JOB_EVENTS = ['job_succeeded', 'job_failed'] as const

export interface AnalyticsEventInput {
  userId: string
  type: string
  subjectType?: string | null
  subjectId?: string | null
  metadata?: Record<string, unknown> | null
}

export interface AnalyticsEventSink {
  record(input: AnalyticsEventInput): Promise<void>
}

const localDateStart = (query: AnalyticsQuery): SQL =>
  sql`(${query.from}::date::timestamp at time zone ${query.tz})`

const localDateEnd = (query: AnalyticsQuery): SQL =>
  sql`((${query.to}::date + 1)::timestamp at time zone ${query.tz})`

const withinRange = (userId: string, query: AnalyticsQuery) =>
  and(
    eq(analyticsEvents.userId, userId),
    gte(analyticsEvents.occurredAt, localDateStart(query)),
    lt(analyticsEvents.occurredAt, localDateEnd(query)),
  )

export const analyticsRepo = (db: DbOrTx) => ({
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
      .where(and(withinRange(userId, query), eq(analyticsEvents.type, key)))
      .groupBy(sql`1`)
      .orderBy(sql`1`)
    return { key, label, points: rows.map((row) => ({ bucket: row.bucket, value: row.value })) }
  },

  async summary(userId: string, query: AnalyticsQuery): Promise<AnalyticsSummary> {
    const eventType = analyticsEvents.type
    const durationSeconds = sql`(${analyticsEvents.metadata}->>'durationMs')::float8 / 1000`
    const medianDurationSql = sql<
      number | null
    >`(percentile_cont(0.5) within group (order by ${durationSeconds}) filter (where ${eventType} = 'job_succeeded'))::float8`
    const [row] = await db
      .select({
        succeeded: sql<number>`(count(*) filter (where ${eventType} = 'job_succeeded'))::int`,
        failed: sql<number>`(count(*) filter (where ${eventType} = 'job_failed'))::int`,
        medianSeconds: medianDurationSql,
      })
      .from(analyticsEvents)
      .where(withinRange(userId, query))
    const succeeded = row?.succeeded ?? 0
    const failed = row?.failed ?? 0
    const finished = succeeded + failed
    const medianSeconds = row?.medianSeconds
    return {
      jobsSucceeded: succeeded,
      jobsFailed: failed,
      successRate: finished === 0 ? null : succeeded / finished,
      medianTimeToReadySeconds:
        medianSeconds === null || medianSeconds === undefined ? null : Math.round(medianSeconds),
    }
  },

  async models(userId: string, query: AnalyticsQuery): Promise<AnalyticsModelUse[]> {
    const model = sql<string>`${analyticsEvents.metadata}->>'model'`
    const rows = await db
      .select({ model, generations: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(
        and(
          withinRange(userId, query),
          inArray(analyticsEvents.type, [...JOB_EVENTS]),
          sql`${model} is not null`,
        ),
      )
      .groupBy(model)
      .orderBy(desc(sql`count(*)`))
      .limit(10)
    return rows.map((row) => ({ model: row.model, generations: row.generations }))
  },
})
