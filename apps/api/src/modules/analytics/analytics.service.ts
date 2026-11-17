import type { AnalyticsQuery, AnalyticsReport, AnalyticsSeries } from '@replo/contracts'
import type { AnalyticsEventInput } from './analytics.repo'

export interface AnalyticsQueryReader {
  series(
    userId: string,
    query: AnalyticsQuery,
    key: string,
    label: string,
  ): Promise<AnalyticsSeries>
}

export interface AnalyticsService {
  report(userId: string, query: AnalyticsQuery): Promise<AnalyticsReport>
}

export const ANALYTICS_SERIES: { key: string; label: string }[] = [
  { key: 'job_succeeded', label: 'Generations finished' },
  { key: 'job_failed', label: 'Generations failed' },
  { key: 'course_published', label: 'Courses published' },
  { key: 'lesson_completed', label: 'Lessons completed' },
  { key: 'quiz_submitted', label: 'Quiz answers' },
]

export type AnalyticsEventSink = (input: AnalyticsEventInput) => Promise<void>

export function createAnalyticsService(deps: { reader: AnalyticsQueryReader }): AnalyticsService {
  const { reader } = deps
  return {
    async report(userId, query) {
      const series = await Promise.all(
        ANALYTICS_SERIES.map((item) => reader.series(userId, query, item.key, item.label)),
      )
      return { query, series: series.filter((item) => item.points.length > 0) }
    },
  }
}