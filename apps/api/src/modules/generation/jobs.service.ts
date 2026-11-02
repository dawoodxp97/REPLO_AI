import {
  MICROS_PER_USD,
  type Audience,
  type GenerationJobDto,
  type ModelPlan,
} from '@replo/contracts'
import { CanceledError, StoppedError } from '../../jobs/errors'
import type { Db, Tx } from '../../platform/db/client'
import { conflict, requireFound } from '../../platform/errors'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeyJobs } from '../keys/keys.service'
import type { NotificationsService } from '../notifications/notifications.service'
import type { TutorialReader } from '../tutorials/reader.service'
import {
  KEY_REMOVED,
  RETRYABLE_STATUSES,
  TERMINAL_STATUSES,
  isStatusIn,
  jobsRepo,
  type JobRow,
} from './generation.repo'
import { announceClosed } from './job-closure'
import { enqueueTutorial } from './job-payload'

const CANCEL_ATTEMPTS = 2
const SETTLED_STATUSES = [...TERMINAL_STATUSES, 'canceling'] as const

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
  tutorials: Pick<TutorialReader, 'refOf'>
}

export interface JobService extends KeyJobs {
  getOwnedJob(userId: string, jobId: string): Promise<JobRow>
  toDto(job: JobRow): Promise<GenerationJobDto>
  findByIdempotencyKey(userId: string, key: string): Promise<JobRow | undefined>
  createJob(tx: Tx, input: NewJob): Promise<{ job: JobRow; created: boolean }>
  cancel(userId: string, jobId: string): Promise<GenerationJobDto>
  retry(userId: string, jobId: string): Promise<GenerationJobDto>
  linkTutorial(tx: Tx, jobId: string, tutorialId: string): Promise<void>
  fenceRunning(tx: Tx, jobId: string, attempt: number): Promise<void>
}

export function createJobService(deps: JobServiceDeps): JobService {
  const { db, queue, indexing, notifications, tutorials } = deps

  const getOwnedJob: JobService['getOwnedJob'] = async (userId, jobId) => {
    const job = await jobsRepo(db).findOwned(jobId, userId)
    return requireFound(job, 'Job')
  }

  const toDto: JobService['toDto'] = async (job) => {
    const snapshot = requireFound(await indexing.snapshotRef(job.snapshotId), 'Snapshot')
    const tutorial = job.tutorialId
      ? await tutorials.refOf({ userId: job.userId }, job.tutorialId)
      : undefined
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
      tutorial: tutorial ?? null,
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
      await getOwnedJob(userId, jobId)
      for (let attempt = 0; attempt < CANCEL_ATTEMPTS; attempt++) {
        const settled = await db.transaction(async (tx) => {
          const repo = jobsRepo(tx)
          if (await repo.requestCancel(jobId)) return true
          const canceled = await repo.cancelIfIdle(jobId)
          if (!canceled) return false
          await announceClosed(tx, notifications, { id: jobId, userId }, 'canceled')
          return true
        })
        const current = await getOwnedJob(userId, jobId)
        if (settled || isStatusIn(SETTLED_STATUSES, current.status)) return toDto(current)
      }
      return conflict('Job changed state; try again')
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

    async fenceRunning(tx, jobId, attempt) {
      const row = await jobsRepo(tx).lockForUpdate(jobId)
      if (row?.status === 'canceling') throw new CanceledError()
      if (row?.status !== 'running' || row.attempts !== attempt) throw new StoppedError()
    },

    async failForKey(tx, keyId) {
      const repo = jobsRepo(tx)
      for (const failed of await repo.failForKey(keyId))
        await announceClosed(tx, notifications, failed, 'failed', { code: KEY_REMOVED })
    },
  }
}
