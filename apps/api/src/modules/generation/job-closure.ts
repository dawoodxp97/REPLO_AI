import type { Tx } from '../../platform/db/client'
import type { NotificationsService } from '../notifications/notifications.service'
import { jobsRepo, type JobEventInput, type JobFailure, type JobRow } from './generation.repo'

type JobStatus = JobRow['status']

export type ClosedStatus = 'succeeded' | 'failed' | 'canceled'

export interface ClosedJob {
  id: string
  userId: string
}

export function terminalEvent(status: ClosedStatus, error?: JobFailure): JobEventInput {
  if (status === 'failed' && error) return { type: 'failed', data: { code: error.code } }
  return { type: status }
}

export async function announceClosed(
  tx: Tx,
  notifications: NotificationsService,
  job: ClosedJob,
  status: ClosedStatus,
  error?: JobFailure,
): Promise<void> {
  await jobsRepo(tx).emit(job.id, terminalEvent(status, error))
  await notifications.recordJobEnd(tx, { userId: job.userId, jobId: job.id, status })
}

export async function closeJob(
  tx: Tx,
  notifications: NotificationsService,
  jobId: string,
  status: ClosedStatus,
  error?: JobFailure,
  from?: readonly JobStatus[],
): Promise<boolean> {
  const closed = await jobsRepo(tx).finish(jobId, status, error, from)
  if (!closed) return false
  await announceClosed(tx, notifications, { id: jobId, userId: closed.userId }, status, error)
  return true
}
