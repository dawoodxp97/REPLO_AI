import { oc } from '@orpc/contract'
import { z } from 'zod'
import { JobStatus, Stage } from './jobs'
import { OffsetCursor, Provider, pageInput } from './common'
import { Pipeline } from './models'

export const OperatorJobRow = z.object({
  jobId: z.uuid(),
  userId: z.string(),
  status: JobStatus,
  stage: Stage.nullable(),
  progress: z.number().int().min(0).max(100),
  pipeline: Pipeline,
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  spentMicros: z.number().int().nonnegative(),
  budgetMicros: z.number().int().nonnegative(),
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
      inputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
      costMicros: z.number().int().nonnegative(),
      latencyMs: z.number().int().nonnegative(),
      status: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
})
export type OperatorJobDetail = z.infer<typeof OperatorJobDetail>

export const operatorContract = {
  jobs: oc
    .route({ method: 'GET', path: '/operator/jobs' })
    .input(pageInput(OffsetCursor).extend({ status: JobStatus.optional() }))
    .output(z.object({ items: z.array(OperatorJobRow), nextCursor: z.string().nullable() })),
  job: oc
    .route({ method: 'GET', path: '/operator/jobs/{jobId}' })
    .input(z.object({ jobId: z.uuid() }))
    .output(OperatorJobDetail),
}
