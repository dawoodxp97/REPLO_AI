import type {
  AnalyticsQuery,
  AnalyticsReport,
  AnalyticsSeries,
  SavedDashboard,
  SavedDashboardPage,
} from '@replo/contracts'
import { ORPCError } from '@orpc/server'
import type { Db } from '../../platform/db/client'
import { notFound, requireFound } from '../../platform/errors'
import { decodeOffset, offsetPage } from '../../platform/pagination'
import { analyticsRepo } from '../analytics/analytics.repo'
import { dashboardsRepo } from './dashboards.repo'

const ANALYTICS_SERIES: { key: string; label: string }[] = [
  { key: 'job_succeeded', label: 'Generations finished' },
  { key: 'job_failed', label: 'Generations failed' },
  { key: 'lesson_completed', label: 'Lessons completed' },
  { key: 'quiz_submitted', label: 'Quiz answers' },
]

export interface AnalyticsService {
  report(userId: string, query: AnalyticsQuery): Promise<AnalyticsReport>
  save(userId: string, input: { name: string; query: AnalyticsQuery }): Promise<SavedDashboard>
  list(userId: string, input: { limit: number; cursor?: string }): Promise<SavedDashboardPage>
  remove(userId: string, dashboardId: string): Promise<void>
  searchOwn(
    userId: string,
    query: string,
    limit: number,
  ): Promise<{ dashboardId: string; name: string }[]>
}

const toDto = (row: {
  id: string
  name: string
  query: unknown
  createdAt: Date
  updatedAt: Date
}): SavedDashboard => ({
  id: row.id,
  name: row.name,
  query: row.query as AnalyticsQuery,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

export function createAnalyticsService(db: Db): AnalyticsService {
  const events = analyticsRepo(db)
  const dashboards = dashboardsRepo(db)

  return {
    async report(userId, query) {
      const [series, summary, models] = await Promise.all([
        Promise.all(
          ANALYTICS_SERIES.map((item) => events.series(userId, query, item.key, item.label)),
        ),
        events.summary(userId, query),
        events.models(userId, query),
      ])
      return { query, series: series.filter(isNonEmpty), summary, models }
    },

    async save(userId, input) {
      if (await dashboards.nameTaken(userId, input.name)) {
        throw new ORPCError('DASHBOARD_NAME_TAKEN', {
          message: 'A dashboard with that name exists',
        })
      }
      return toDto(await dashboards.insert(userId, input.name, input.query))
    },

    async list(userId, { limit, cursor }) {
      const offset = decodeOffset(cursor)
      const rows = await dashboards.list(userId, limit + 1, offset)
      const page = offsetPage(rows, offset, limit)
      return { items: page.items.map(toDto), nextCursor: page.nextCursor }
    },

    async remove(userId, dashboardId) {
      requireFound(await dashboards.find(userId, dashboardId), 'Saved dashboard')
      if (!(await dashboards.remove(userId, dashboardId))) notFound('Saved dashboard')
    },

    searchOwn: (userId, query, limit) => dashboards.search(userId, `%${query}%`, limit),
  }
}

function isNonEmpty(series: AnalyticsSeries): boolean {
  return series.points.length > 0
}
