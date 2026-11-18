import type { Stage } from '@replo/contracts'
import type PgBoss from 'pg-boss'
import { z } from 'zod'

export const GENERATE_COURSE = 'generate-course'
export const REAP_STALLED_JOBS = 'reap-stalled-jobs'
export const PURGE_RETENTION = 'purge-retention'

export const GenerateCoursePayload = z.object({ jobId: z.uuid() })
export type GenerateCoursePayload = z.infer<typeof GenerateCoursePayload>

export const PROGRESS: Record<Stage, number> = {
  ingest: 10,
  index: 25,
  enrich: 40,
  'graph-review': 50,
  tours: 58,
  diagrams: 66,
  outline: 74,
  lessons: 88,
  validate: 96,
  publish: 100,
}

export const STAGE_TIMEOUT_MS: Record<Stage, number> = {
  ingest: 120_000,
  index: 300_000,
  enrich: 300_000,
  'graph-review': 120_000,
  tours: 180_000,
  diagrams: 300_000,
  outline: 180_000,
  lessons: 900_000,
  validate: 300_000,
  publish: 60_000,
}

export const STAGE_ABORT_GRACE_MS = 5_000

export const MAX_ATTEMPTS = 4

const RETRY_DELAY_SECONDS = 30

export async function declareQueues(boss: PgBoss): Promise<void> {
  await boss.createQueue(GENERATE_COURSE, {
    name: GENERATE_COURSE,
    retryLimit: MAX_ATTEMPTS - 1,
    retryDelay: RETRY_DELAY_SECONDS,
    retryBackoff: true,
  })
  await boss.createQueue(REAP_STALLED_JOBS, { name: REAP_STALLED_JOBS })
  await boss.createQueue(PURGE_RETENTION, { name: PURGE_RETENTION })
}
