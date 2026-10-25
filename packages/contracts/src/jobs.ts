import { oc } from '@orpc/contract'
import { z } from 'zod'
import { CommitSha } from './common'

export const JOB_STATUSES = [
  'queued',
  'running',
  'waiting_retry',
  'stalled',
  'canceling',
  'succeeded',
  'failed',
  'canceled',
] as const
export const JobStatus = z.enum(JOB_STATUSES)
export type JobStatus = z.infer<typeof JobStatus>

export const STAGES = [
  'ingest',
  'index',
  'summaries',
  'architecture',
  'outline',
  'lessons',
  'validate',
  'publish',
] as const
export const Stage = z.enum(STAGES)
export type Stage = z.infer<typeof Stage>

export const GenerationJobDto = z.object({
  jobId: z.uuid(),
  repositoryId: z.uuid(),
  commitSha: CommitSha,
  status: JobStatus,
  stage: Stage.nullable(),
  progress: z.number().int().min(0).max(100).default(0),
  budgetUsd: z.number(),
  spentUsd: z.number(),
  tutorialId: z.uuid().nullable().default(null),
  error: z.object({ code: z.string() }).nullable().default(null),
})
export type GenerationJobDto = z.infer<typeof GenerationJobDto>

export const JobEventType = z.enum([
  'queued',
  'stage_started',
  'stage_completed',
  'progress',
  'warning',
  'error',
  'succeeded',
  'failed',
  'canceled',
])
export type JobEventType = z.infer<typeof JobEventType>

export const JobEventData = z.record(z.string(), z.unknown())
export type JobEventData = z.infer<typeof JobEventData>

export const JobEventDto = z.object({
  id: z.number().int(),
  jobId: z.uuid(),
  type: JobEventType,
  stage: Stage.nullable(),
  data: JobEventData.nullable(),
  at: z.iso.datetime(),
})
export type JobEventDto = z.infer<typeof JobEventDto>

export const jobsContract = {
  get: oc
    .route({ method: 'GET', path: '/jobs/{jobId}' })
    .input(z.object({ jobId: z.uuid() }))
    .output(GenerationJobDto),
  cancel: oc
    .route({ method: 'POST', path: '/jobs/{jobId}/cancel' })
    .input(z.object({ jobId: z.uuid() }))
    .output(GenerationJobDto),
  retry: oc
    .route({ method: 'POST', path: '/jobs/{jobId}/retry' })
    .input(z.object({ jobId: z.uuid() }))
    .output(GenerationJobDto)
    .errors({ CONFLICT: {} }),
}
