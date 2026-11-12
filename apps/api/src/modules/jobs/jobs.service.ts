import {
  MICROS_PER_USD,
  ModelPreset,
  type Audience,
  type GenerationJobDto,
  type ModelPlan,
} from '@replo/contracts'
import { CanceledError, StoppedError } from '../../worker/errors'
import type { Db, Tx } from '../../platform/db/client'
import { conflict, requireFound } from '../../platform/errors'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeyJobs } from '../keys/keys.service'
import type { NotificationsService } from '../notifications/notifications.service'
import type { RepositoryLibrary } from '../repositories/library.service'
import type { VersionAccess } from '../tutorials/version-access.service'
import {
  KEY_REMOVED,
  jobsRepo,
  type JobRow,
} from './jobs.repo'
import { RETRYABLE_STATUSES, TERMINAL_STATUSES, isStatusIn } from '../../platform/job-status'
import { announceJobEnd } from './job-ending'
import { GENERATE_TUTORIAL } from '../../worker/job-payload'

const CANCEL_ATTEMPTS = 2
const SETTLED_STATUSES = [...TERMINAL_STATUSES, 'canceling'] as const

// Sent through the caller's transaction, so the job row and its queue message commit
// or roll back together (no dual write).
export const enqueueTutorial = (queue: JobQueue, job: JobRow, tx?: Tx) =>
  queue.send(GENERATE_TUTORIAL, { jobId: job.id }, {
    singletonKey: job.id,
    ...(tx ? { tx } : {}),
  })

export interface NewJob {
  userId: string
  snapshotId: string
  idempotencyKey: string
  audience: Audience
  providerKeyId: string
  models: ModelPlan
  budgetMicros: number
}

export interface JobServiceDeps {
  db: Db
  queue: JobQueue
  indexing: Pick<IndexingService, 'snapshotRef'>
  notifications: NotificationsService
  tutorials: Pick<VersionAccess, 'refOf'>
  repositories: Pick<RepositoryLibrary, 'describeLinked'>
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
  const { db, queue, indexing, notifications, tutorials, repositories } = deps

  const getOwnedJob: JobService['getOwnedJob'] = async (userId, jobId) => {
    const job = await jobsRepo(db).findOwned(jobId, userId)
    return requireFound(job, 'Job')
  }

  const toDto: JobService['toDto'] = async (job) => {
    const snapshot = requireFound(await indexing.snapshotRef(job.snapshotId), 'Snapshot')
    const [tutorial, names] = await Promise.all([
      job.tutorialId ? tutorials.refOf({ userId: job.userId }, job.tutorialId) : undefined,
      repositories.describeLinked(job.userId, [snapshot.repositoryId]),
    ])
    return {
      jobId: job.id,
      repositoryId: snapshot.repositoryId,
      repository: names.get(snapshot.repositoryId) ?? null,
      commitSha: snapshot.commitSha,
      audience: job.audience,
      preset: ModelPreset.safeParse(job.models.preset).data ?? null,
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
      const job = await repo.insertJob(input)
      // Two requests with the same Idempotency-Key race here. The loser's insert hits the
      // unique key, so it returns the winner's job and never enqueues a second paid run (D-066).
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
      // The status can move between the two updates (a worker claims an idle job), so a
      // second pass acts on the new state.
      for (let attempt = 0; attempt < CANCEL_ATTEMPTS; attempt++) {
        const settled = await db.transaction(async (tx) => {
          const repo = jobsRepo(tx)
          if (await repo.requestCancel(jobId)) return true
          const canceled = await repo.cancelIfIdle(jobId)
          if (!canceled) return false
          await announceJobEnd(tx, notifications, { id: jobId, userId }, 'canceled')
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
        // Stages and checkpoints are kept, so the retry resumes and does not pay again for
        // work that already succeeded (FR-GEN-11).
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

    // Publish commits while holding this row lock. If the user canceled, the key was
    // deleted, or the reaper re-sent the job (attempts moved on), this attempt must not publish.
    async fenceRunning(tx, jobId, attempt) {
      const row = await jobsRepo(tx).lockForUpdate(jobId)
      if (row?.status === 'canceling') throw new CanceledError()
      if (row?.status !== 'running' || row.attempts !== attempt) throw new StoppedError()
    },

    async failForKey(tx, keyId) {
      const repo = jobsRepo(tx)
      for (const failed of await repo.failForKey(keyId))
        await announceJobEnd(tx, notifications, failed, 'failed', { code: KEY_REMOVED })
    },
  }
}
