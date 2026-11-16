import { oc } from '@orpc/contract'
import { z } from 'zod'
import { NonNegativeInt, OffsetCursor, pageInput, pageOutput, TimeZone } from './common'
import { JobProgressFields } from './jobs'

export const DashboardSummary = z.object({
  counts: z.object({
    total: NonNegativeInt,
    draft: NonNegativeInt,
  }),
  jobsInFlight: z.array(
    z.object({
      ...JobProgressFields,
      repositoryId: z.uuid(),
      owner: z.string(),
      repo: z.string(),
    }),
  ),
  resume: z
    .object({
      courseId: z.uuid(),
      versionId: z.uuid(),
      lessonKey: z.string(),
      lessonTitle: z.string(),
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
    })
    .nullable(),
  reading: z.object({
    lessonsCompleted: NonNegativeInt,
    lessonsCompletedLast7Days: NonNegativeInt,
    quizAnswers: NonNegativeInt,
    quizAnswersCorrect: NonNegativeInt,
  }),
})
export type DashboardSummary = z.infer<typeof DashboardSummary>

export const ActivityItem = z.object({
  id: z.string(),
  kind: z.enum(['job_started', 'job_finished', 'course_published']),
  title: z.string(),
  localDate: z.iso.date(),
  at: z.iso.datetime(),
  link: z.string().nullable(),
})
export type ActivityItem = z.infer<typeof ActivityItem>

export const ActivityPage = pageOutput(ActivityItem, OffsetCursor)
export type ActivityPage = z.infer<typeof ActivityPage>

export const AnalyticsGranularity = z.enum(['day', 'week', 'month'])
export type AnalyticsGranularity = z.infer<typeof AnalyticsGranularity>

export const AnalyticsQuery = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  granularity: AnalyticsGranularity.default('day'),
  tz: TimeZone.default('UTC'),
  filters: z.record(z.string(), z.string()).default({}),
})
export type AnalyticsQuery = z.infer<typeof AnalyticsQuery>

export const AnalyticsPoint = z.object({ bucket: z.string(), value: z.number() })
export type AnalyticsPoint = z.infer<typeof AnalyticsPoint>

export const SavedDashboard = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  query: AnalyticsQuery,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type SavedDashboard = z.infer<typeof SavedDashboard>

export const dashboardContract = {
  summary: oc.route({ method: 'GET', path: '/dashboard/summary' }).output(DashboardSummary),
  recent: oc
    .route({ method: 'GET', path: '/dashboard/recent' })
    .input(pageInput(OffsetCursor).extend({ tz: TimeZone.default('UTC') }))
    .output(ActivityPage),
}
