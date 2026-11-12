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
} from './jobs.repo'
import type { TerminalStatus } from '../../platform/job-status'
import { endJob } from './job-ending'
import { enqueueTutorial } from './jobs.service'

export interface JobStore {
  claim(jobId: string): Promise<JobRow | undefined>
  heartbeat(jobId: string): Promise<'ok' | 'canceling' | 'stopped'>
  setStage(jobId: string, stage: Stage, progress?: number): Promise<void>
  isStageComplete(jobId: string, stage: Stage): Promise<boolean>
  completeStage(jobId: string, stage: Stage): Promise<void>
  emit(jobId: string, event: JobEventInput): Promise<number | undefined>
  finish(jobId: string, status: TerminalStatus, error?: JobFailure): Promise<boolean>
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
  const repo = jobsRepo(db)

  return {
    jobStore: {
      ...repo,
      finish: (jobId, status, error) =>
        db.transaction((tx) => endJob(tx, notifications, jobId, status, error)),
      markWaitingRetry: (jobId, error) =>
        db.transaction(async (tx) => {
          if (await jobsRepo(tx).markWaitingRetry(jobId, error)) return true
          // Not running or stalled means the user asked to cancel while this stage was failing:
          // honour the cancel instead of retrying (D-094).
          await endJob(tx, notifications, jobId, 'canceled', undefined, ['canceling'])
          return false
        }),
    },

    usageSink: async (record) => {
      // The call record and the spend update commit together, so a crash cannot keep one
      // without the other.
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

    // Runs every minute on the worker. Stalled jobs are re-sent, not failed: claim accepts
    // them and finished stages are skipped.
    async requeueStalled() {
      await repo.stallStale()
      for (const job of await repo.stalledJobs()) await enqueueTutorial(queue, job)
    },
  }
}
