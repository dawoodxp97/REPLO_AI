import type { Tx } from '../../platform/db/client'
import type { TerminalStatus } from '../../platform/job-status'
import type { NotificationsService } from '../notifications/notifications.service'
import { jobsRepo, type JobEventInput, type JobFailure, type JobRow } from './jobs.repo'

type JobStatus = JobRow['status']

export interface EndedJob {
  id: string
  userId: string
}

export function terminalEvent(status: TerminalStatus, error?: JobFailure): JobEventInput {
  if (status === 'failed' && error) return { type: 'failed', data: { code: error.code } }
  return { type: status }
}

export async function announceJobEnd(
  tx: Tx,
  notifications: NotificationsService,
  job: EndedJob,
  status: TerminalStatus,
  error?: JobFailure,
): Promise<void> {
  await jobsRepo(tx).emit(job.id, terminalEvent(status, error))
  await notifications.recordJobEnd(tx, { userId: job.userId, jobId: job.id, status })
}

export async function endJob(
  tx: Tx,
  notifications: NotificationsService,
  jobId: string,
  status: TerminalStatus,
  error?: JobFailure,
  from?: readonly JobStatus[],
): Promise<boolean> {
  const closed = await jobsRepo(tx).finish(jobId, status, error, from)
  // finish matches only an in-flight row, so when the worker, a cancel and a key deletion
  // race, exactly one of them announces the end (D-094).
  if (!closed) return false
  await announceJobEnd(tx, notifications, { id: jobId, userId: closed.userId }, status, error)
  return true
}
