import { oc } from '@orpc/contract'
import { z } from 'zod'
import { JobProgressFields, JobStatus, Stage } from './jobs'
import { JobRef, NonNegativeInt, OffsetCursor, Provider, pageInput, pageOutput } from './common'
import { Pipeline } from './models'

export const OperatorJobRow = z.object({
  ...JobProgressFields,
  userId: z.string(),
  pipeline: Pipeline,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attempts: NonNegativeInt,
  spentMicros: NonNegativeInt,
  budgetMicros: NonNegativeInt,
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
  llmCalls: z.array(
    z.object({
      id: z.uuid(),
      stage: z.string(),
      provider: Provider,
      model: z.string(),
      inputTokens: NonNegativeInt,
      outputTokens: NonNegativeInt,
      costMicros: NonNegativeInt,
      latencyMs: NonNegativeInt,
      status: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
})
export type OperatorJobDetail = z.infer<typeof OperatorJobDetail>

export const OperatorJobPage = pageOutput(OperatorJobRow, OffsetCursor)
export type OperatorJobPage = z.infer<typeof OperatorJobPage>

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
