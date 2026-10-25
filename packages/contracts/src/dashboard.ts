import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OffsetCursor, pageInput } from './common'
import { JobStatus, Stage } from './jobs'

export const TimeZone = z.string().refine((zone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}, 'unknown IANA time zone')

export const DashboardSummary = z.object({
  counts: z.object({
    total: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    private: z.number().int().nonnegative(),
    link: z.number().int().nonnegative(),
    public: z.number().int().nonnegative(),
  }),
  jobsInFlight: z.array(
    z.object({
      jobId: z.uuid(),
      repositoryId: z.uuid(),
      owner: z.string(),
      repo: z.string(),
      status: JobStatus,
      stage: Stage.nullable(),
      progress: z.number().int().min(0).max(100),
    }),
  ),
  resume: z
    .object({
      tutorialId: z.uuid(),
      versionId: z.uuid(),
      lessonKey: z.string(),
      lessonTitle: z.string(),
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
    })
    .nullable(),
})
export type DashboardSummary = z.infer<typeof DashboardSummary>

export const ActivityItem = z.object({
  id: z.string(),
  kind: z.enum(['job_started', 'job_finished', 'tutorial_published']),
  title: z.string(),
  localDate: z.iso.date(),
  at: z.iso.datetime(),
  link: z.string().nullable(),
})
export type ActivityItem = z.infer<typeof ActivityItem>

export const ActivityPage = z.object({
  items: z.array(ActivityItem),
  nextCursor: z.string().nullable(),
})
export type ActivityPage = z.infer<typeof ActivityPage>

export const dashboardContract = {
  summary: oc
    .route({ method: 'GET', path: '/dashboard/summary' })
    .input(z.object({ tz: TimeZone.default('UTC') }))
    .output(DashboardSummary),
  recent: oc
    .route({ method: 'GET', path: '/dashboard/recent' })
    .input(pageInput(OffsetCursor).extend({ tz: TimeZone.default('UTC') }))
    .output(ActivityPage),
}
