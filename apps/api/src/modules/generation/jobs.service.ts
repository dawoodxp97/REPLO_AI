import {
  MICROS_PER_USD,
  type Audience,
  type GenerationJobDto,
  type ModelPlan,
} from '@replo/contracts'
import type { Db, Tx } from '../../platform/db/client'
import { conflict, notFound } from '../../platform/errors'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeyJobs } from '../keys/keys.service'
import type { NotificationsService } from '../notifications/notifications.service'
import {
  IDLE_STATUSES,
  KEY_REMOVED,
  RETRYABLE_STATUSES,
  isStatusIn,
  jobsRepo,
  type JobRow,
} from './generation.repo'
import { enqueueTutorial } from './job-payload'

export interface NewJob {
  userId: string
  snapshotId: string
  idempotencyKey: string
  audience: Audience
  keyId: string
  models: ModelPlan
  budgetMicros: number
}

export interface JobServiceDeps {
  db: Db
  queue: JobQueue
  indexing: Pick<IndexingService, 'snapshotRef'>
  notifications: NotificationsService
}

export interface JobService extends KeyJobs {
  getOwnedJob(userId: string, jobId: string): Promise<JobRow>
  toDto(job: JobRow): Promise<GenerationJobDto>
  findByIdempotencyKey(userId: string, key: string): Promise<JobRow | undefined>
  createJob(tx: Tx, input: NewJob): Promise<{ job: JobRow; created: boolean }>
  cancel(userId: string, jobId: string): Promise<GenerationJobDto>
  retry(userId: string, jobId: string): Promise<GenerationJobDto>
  linkTutorial(tx: Tx, jobId: string, tutorialId: string): Promise<void>
}

export function createJobService(deps: JobServiceDeps): JobService {
  const { db, queue, indexing, notifications } = deps

  const getOwnedJob: JobService['getOwnedJob'] = async (userId, jobId) => {
    const job = await jobsRepo(db).findOwned(jobId, userId)
    return job ?? notFound('Job')
  }

  const toDto: JobService['toDto'] = async (job) => {
    const snapshot = await indexing.snapshotRef(job.snapshotId)
    if (!snapshot) notFound('Snapshot')
    return {
      jobId: job.id,
      repositoryId: snapshot.repositoryId,
      commitSha: snapshot.commitSha,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      budgetUsd: job.budgetMicros / MICROS_PER_USD,
      spentUsd: job.spentMicros / MICROS_PER_USD,
      tutorialId: job.tutorialId,
      error: job.errorCode ? { code: job.errorCode } : null,
    }
  }

  return {
    getOwnedJob,
    toDto,

    findByIdempotencyKey(userId, key) {
      return jobsRepo(db).findByIdempotencyKey(userId, key)
    },

    async createJob(tx, input) {
      const repo = jobsRepo(tx)
      const job = await repo.insertJob({ ...input, kind: 'generate' })
      if (!job) {
        const existing = await repo.findByIdempotencyKey(input.userId, input.idempotencyKey)
        if (!existing) throw new Error('idempotent job vanished after conflict')
        return { job: existing, created: false }
      }
      await repo.emit(job.id, { type: 'queued' })
      await enqueueTutorial(queue, job, tx)
      return { job, created: true }
    },

    async cancel(userId, jobId) {
      const job = await getOwnedJob(userId, jobId)
      if (job.status === 'running') {
        await jobsRepo(db).requestCancel(job.id)
      } else if (isStatusIn(IDLE_STATUSES, job.status)) {
        await db.transaction(async (tx) => {
          const repo = jobsRepo(tx)
          const canceled = await repo.cancelIfIdle(job.id)
          if (!canceled) return
          await repo.emit(job.id, { type: 'canceled' })
          await notifications.recordJobEnd(tx, { userId, jobId: job.id, status: 'canceled' })
        })
      }
      return toDto(await getOwnedJob(userId, jobId))
    },

    async retry(userId, jobId) {
      const job = await getOwnedJob(userId, jobId)
      if (!isStatusIn(RETRYABLE_STATUSES, job.status))
        conflict('Only failed or canceled jobs can be retried')
      const retried = await db.transaction(async (tx) => {
        const repo = jobsRepo(tx)
        const reset = await repo.resetForRetry(job.id)
        if (!reset) return undefined
        await repo.emit(reset.id, { type: 'queued' })
        await enqueueTutorial(queue, reset, tx)
        return reset
      })
      if (!retried) conflict('Job changed state; reload and try again')
      return toDto(retried)
    },

    async linkTutorial(tx, jobId, tutorialId) {
      await jobsRepo(tx).linkTutorial(jobId, tutorialId)
    },

    async failForKey(tx, keyId) {
      const repo = jobsRepo(tx)
      for (const failed of await repo.failForKey(keyId)) {
        await repo.emit(failed.id, { type: 'failed', data: { code: KEY_REMOVED } })
        await notifications.recordJobEnd(tx, {
          userId: failed.userId,
          jobId: failed.id,
          status: 'failed',
        })
      }
    },
  }
}
