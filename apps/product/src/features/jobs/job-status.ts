import type { JobStatus, Stage } from '@replo/contracts'

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  waiting_retry: 'Retrying',
  stalled: 'Stalled',
  canceling: 'Canceling',
  succeeded: 'Succeeded',
  failed: 'Failed',
  canceled: 'Canceled',
}

export const STAGE_LABELS: Record<Stage, string> = {
  ingest: 'Download and extract repository',
  index: 'Build static index',
  summaries: 'Summarise central files',
  architecture: 'Model the architecture',
  outline: 'Design the curriculum',
  lessons: 'Write lessons and quizzes',
  validate: 'Verify every source reference',
  publish: 'Publish',
}

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'running',
  'waiting_retry',
  'stalled',
  'canceling',
]

export const RETRYABLE_JOB_STATUSES: readonly JobStatus[] = ['failed', 'canceled']
