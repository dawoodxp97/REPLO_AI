import { oc } from '@orpc/contract'
import { z } from 'zod'
import { JobProgressFields, JobStatus, Stage } from './jobs'
import { JobRef, NonNegativeInt, OffsetCursor, pageInput, pageOutput } from './common'
import { Pipeline } from './models'

export const OperatorJobRow = z.object({
  ...JobProgressFields,
  userId: z.string(),
  pipeline: Pipeline,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attempts: NonNegativeInt,
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
})
export type OperatorJobRow = z.infer<typeof OperatorJobRow>

export const OperatorJobDetail = z.object({
  job: OperatorJobRow,
  stages: z.array(
    z.object({
      stage: Stage,
      status: z.literal('completed'),
      attempt: z.number().int(),
      finishedAt: z.iso.datetime().nullable(),
    }),
  ),
})
export type OperatorJobDetail = z.infer<typeof OperatorJobDetail>

export const OperatorJobPage = pageOutput(OperatorJobRow, OffsetCursor)
export type OperatorJobPage = z.infer<typeof OperatorJobPage>

export const AdminSummary = z.object({
  users: NonNegativeInt,
  repositories: NonNegativeInt,
  courses: NonNegativeInt,
  jobsInFlight: NonNegativeInt,
  jobsFailedLast24h: NonNegativeInt,
  storageBytes: NonNegativeInt,
})
export type AdminSummary = z.infer<typeof AdminSummary>

export const operatorContract = {
  jobs: oc
    .route({ method: 'GET', path: '/operator/jobs' })
    .input(pageInput(OffsetCursor).extend({ status: JobStatus.optional() }))
    .output(OperatorJobPage),
  job: oc
    .route({ method: 'GET', path: '/operator/jobs/{jobId}' })
    .input(JobRef)
    .output(OperatorJobDetail),
}
