import type { Stage } from '@replo/contracts'
import { z } from 'zod'

export const GENERATE_TUTORIAL = 'generate-tutorial'
export const REAP_STALLED_JOBS = 'reap-stalled-jobs'
export const PURGE_RETENTION = 'purge-retention'

export const GenerateTutorialPayload = z.object({ jobId: z.uuid() })
export type GenerateTutorialPayload = z.infer<typeof GenerateTutorialPayload>

export const PROGRESS: Record<Stage, number> = {
  ingest: 10,
  index: 25,
  summaries: 35,
  architecture: 50,
  outline: 60,
  lessons: 85,
  validate: 95,
  publish: 100,
}

export const STAGE_TIMEOUT_MS: Record<Stage, number> = {
  ingest: 120_000,
  index: 300_000,
  summaries: 300_000,
  architecture: 300_000,
  outline: 300_000,
  lessons: 900_000,
  validate: 300_000,
  publish: 60_000,
}

export const STAGE_ABORT_GRACE_MS = 5_000

export const MAX_ATTEMPTS = 4
