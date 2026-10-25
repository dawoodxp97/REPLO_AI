import type { UsageSink } from '@replo/ai'
import type { Stage } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { NotificationsService } from '../notifications/notifications.service'
import {
  jobsRepo,
  llmCallsRepo,
  type JobEventInput,
  type JobFailure,
  type JobRow,
} from './generation.repo'
import { enqueueTutorial } from './job-payload'

export interface JobStore {
  claim(jobId: string): Promise<JobRow | undefined>
  heartbeat(jobId: string): Promise<'ok' | 'canceling' | 'stopped'>
  setStage(jobId: string, stage: Stage, progress?: number): Promise<void>
  isStageComplete(jobId: string, stage: Stage): Promise<boolean>
  completeStage(jobId: string, stage: Stage): Promise<void>
  emit(jobId: string, event: JobEventInput): Promise<number | undefined>
  finish(
    jobId: string,
    status: 'succeeded' | 'failed' | 'canceled',
    error?: JobFailure,
  ): Promise<void>
  markWaitingRetry(jobId: string, error: JobFailure): Promise<boolean>
}

export interface JobRuntimeDeps {
  db: Db
  queue: JobQueue
  notifications: NotificationsService
}

export interface JobRuntime {
  jobStore: JobStore
  usageSink: UsageSink
  requeueStalled(): Promise<void>
}

export function createJobRuntime(deps: JobRuntimeDeps): JobRuntime {
  const { db, queue, notifications } = deps

  return {
    jobStore: {
      claim: (jobId) => jobsRepo(db).claim(jobId),
      heartbeat: (jobId) => jobsRepo(db).heartbeat(jobId),
      setStage: (jobId, stage, progress) => jobsRepo(db).setStage(jobId, stage, progress),
      isStageComplete: (jobId, stage) => jobsRepo(db).isStageComplete(jobId, stage),
      completeStage: (jobId, stage) => jobsRepo(db).completeStage(jobId, stage),
      emit: (jobId, event) => jobsRepo(db).emit(jobId, event),
      async finish(jobId, status, error) {
        await db.transaction(async (tx) => {
          const finished = await jobsRepo(tx).finish(jobId, status, error)
          if (finished) {
            await notifications.recordJobEnd(tx, { userId: finished.userId, jobId, status })
          }
        })
      },
      async markWaitingRetry(jobId, error) {
        return db.transaction(async (tx) => {
          const repo = jobsRepo(tx)
          if (await repo.markWaitingRetry(jobId, error)) return true
          const canceled = await repo.finish(jobId, 'canceled')
          if (!canceled) return false
          await repo.emit(jobId, { type: 'canceled' })
          await notifications.recordJobEnd(tx, {
            userId: canceled.userId,
            jobId,
            status: 'canceled',
          })
          return false
        })
      },
    },

    usageSink: async (record) => {
      await db.transaction(async (tx) => {
        await llmCallsRepo(tx).insert({
          jobId: record.jobId,
          stage: record.stage,
          provider: record.spec.provider,
          model: record.spec.id,
          inputTokens: record.inputTokens,
          outputTokens: record.outputTokens,
          costMicros: record.costMicros,
          latencyMs: record.latencyMs,
          status: 'ok',
        })
        await jobsRepo(tx).addSpend(record.jobId, record.costMicros)
      })
    },

    async requeueStalled() {
      const repo = jobsRepo(db)
      await repo.stallStale()
      for (const id of await repo.stalledIds()) {
        const job = await repo.findById(id)
        if (job) await enqueueTutorial(queue, job)
      }
    },
  }
}
