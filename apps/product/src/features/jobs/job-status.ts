import type { JobStatus, Stage } from '@replo/contracts'
import type { Connection, StageState } from './job-progress-state'

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

export const STAGE_STATE_LABELS: Record<StageState, string> = {
  pending: 'waiting',
  running: 'running',
  done: 'done',
  failed: 'failed',
}

export const CONNECTION_LABELS: Record<Connection, string> = {
  connecting: 'Connecting',
  live: 'Live',
  lost: 'Reconnecting',
  closed: 'Finished',
}

export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'running',
  'waiting_retry',
  'stalled',
  'canceling',
]

export const CANCELABLE_JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'running',
  'waiting_retry',
  'stalled',
]

export const RETRYABLE_JOB_STATUSES: readonly JobStatus[] = ['failed', 'canceled']

export function isActiveJob(status: JobStatus): boolean {
  return ACTIVE_JOB_STATUSES.includes(status)
}

export function canCancelJob(status: JobStatus): boolean {
  return CANCELABLE_JOB_STATUSES.includes(status)
}

export function canRetryJob(status: JobStatus): boolean {
  return RETRYABLE_JOB_STATUSES.includes(status)
}
