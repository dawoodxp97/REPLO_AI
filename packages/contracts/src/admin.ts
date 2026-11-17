import { oc } from '@orpc/contract'
import { z } from 'zod'
import { JobProgressFields, JobStatus, Stage } from './jobs'
import { JobRef, NonNegativeInt, OffsetCursor, pageInput, pageOutput } from './common'
import { Pipeline } from './models'

export const AdminJobRow = z.object({
  ...JobProgressFields,
  userId: z.string(),
  pipeline: Pipeline,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attempts: NonNegativeInt,
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
})
export type AdminJobRow = z.infer<typeof AdminJobRow>

export const AdminJobDetail = z.object({
  job: AdminJobRow,
  stages: z.array(
    z.object({
      stage: Stage,
      status: z.literal('completed'),
      attempt: z.number().int(),
      finishedAt: z.iso.datetime().nullable(),
    }),
  ),
})
export type AdminJobDetail = z.infer<typeof AdminJobDetail>

export const AdminJobPage = pageOutput(AdminJobRow, OffsetCursor)
export type AdminJobPage = z.infer<typeof AdminJobPage>

export const AdminSummary = z.object({
  users: NonNegativeInt,
  repositories: NonNegativeInt,
  courses: NonNegativeInt,
  jobsInFlight: NonNegativeInt,
  jobsFailedLast24h: NonNegativeInt,
  storageBytes: NonNegativeInt,
})
export type AdminSummary = z.infer<typeof AdminSummary>

export const AdminUserRow = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  createdAt: z.iso.datetime(),
  lastSeenAt: z.iso.datetime().nullable(),
  repositories: NonNegativeInt,
  courses: NonNegativeInt,
  jobs: NonNegativeInt,
})
export type AdminUserRow = z.infer<typeof AdminUserRow>

export const AdminUserPage = pageOutput(AdminUserRow, OffsetCursor)
export type AdminUserPage = z.infer<typeof AdminUserPage>

export const AdminQueueRow = z.object({
  name: z.string(),
  queued: NonNegativeInt,
  active: NonNegativeInt,
  failed: NonNegativeInt,
  lastRunAt: z.iso.datetime().nullable(),
})
export type AdminQueueRow = z.infer<typeof AdminQueueRow>

export const AdminSystemStatus = z.object({
  database: z.enum(['up', 'down']),
  queues: z.array(AdminQueueRow),
  jobs: z.object({
    queued: NonNegativeInt,
    running: NonNegativeInt,
    stalled: NonNegativeInt,
    failed24h: NonNegativeInt,
  }),
  storageBytes: NonNegativeInt,
  version: z.string(),
})
export type AdminSystemStatus = z.infer<typeof AdminSystemStatus>

export const adminContract = {
  overview: oc.route({ method: 'GET', path: '/admin/overview' }).output(AdminSummary),
  users: oc
    .route({ method: 'GET', path: '/admin/users' })
    .input(pageInput(OffsetCursor).extend({ q: z.string().trim().min(1).max(100).optional() }))
    .output(AdminUserPage),
  jobs: oc
    .route({ method: 'GET', path: '/admin/jobs' })
    .input(pageInput(OffsetCursor).extend({ status: JobStatus.optional() }))
    .output(AdminJobPage),
  job: oc.route({ method: 'GET', path: '/admin/jobs/{jobId}' }).input(JobRef).output(AdminJobDetail),
  queues: oc.route({ method: 'GET', path: '/admin/queues' }).output(z.array(AdminQueueRow)),
  system: oc.route({ method: 'GET', path: '/admin/system' }).output(AdminSystemStatus),
}