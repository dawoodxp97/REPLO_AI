import {
  ModelPlan,
  type OperatorJobDetail,
  type OperatorJobRow,
  type Stage,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { readModelRepo, retentionRepo, jobsRepo, type JobRow } from './generation.repo'

export interface InFlightJob {
  jobId: string
  repositoryId: string
  status: JobRow['status']
  stage: Stage | null
  progress: number
}

export interface RecentJob {
  jobId: string
  repositoryId: string
  status: JobRow['status']
  localDate: string
  at: string
}

export interface JobHistory {
  latestByRepository(
    userId: string,
    repositoryIds: string[],
  ): Promise<Map<string, { jobId: string; status: JobRow['status'] }>>
  inFlightFor(userId: string, limit: number): Promise<InFlightJob[]>
  recentFor(
    userId: string,
    input: { zone: string; repositoryIds: readonly string[]; limit: number; offset: number },
  ): Promise<RecentJob[]>
  operatorJobs(input: {
    status?: JobRow['status'] | undefined
    limit: number
    offset: number
  }): Promise<OperatorJobRow[]>
  operatorJob(jobId: string): Promise<OperatorJobDetail | undefined>
  purgeHistory(input: {
    eventsBefore: Date
    succeededBefore: Date
    closedBefore: Date
  }): Promise<string[]>
}

export function createJobHistory(db: Db): JobHistory {
  return {
    async latestByRepository(userId, repositoryIds) {
      const rows = await jobsRepo(db).latestByRepository(userId, repositoryIds)
      return new Map(
        rows.map((row) => [row.repositoryId, { jobId: row.jobId, status: row.status }]),
      )
    },

    async inFlightFor(userId, limit) {
      return readModelRepo(db).inFlightFor(userId, limit)
    },

    async recentFor(userId, input) {
      if (input.repositoryIds.length === 0) return []
      const rows = await readModelRepo(db).recentFor(userId, input)
      return rows.map((row) => ({
        jobId: row.jobId,
        repositoryId: row.repositoryId,
        status: row.status,
        localDate: row.localDate,
        at: (row.finishedAt ?? row.createdAt).toISOString(),
      }))
    },

    async operatorJobs(input) {
      const rows = await readModelRepo(db).operatorPage(
        { status: input.status },
        input.limit,
        input.offset,
      )
      return rows.map(toOperatorRow)
    },

    async operatorJob(jobId) {
      const detail = await readModelRepo(db).operatorDetail(jobId)
      if (!detail) return undefined
      return {
        job: toOperatorRow(detail.job),
        stages: detail.stages.map((stage) => ({
          stage: stage.stage,
          status: stage.status,
          attempt: stage.attempt,
          finishedAt: stage.finishedAt?.toISOString() ?? null,
        })),
        llmCalls: detail.calls.map((call) => ({
          id: call.id,
          stage: call.stage,
          provider: call.provider,
          model: call.model,
          inputTokens: call.inputTokens,
          outputTokens: call.outputTokens,
          costMicros: call.costMicros,
          latencyMs: call.latencyMs,
          status: call.status,
          createdAt: call.createdAt.toISOString(),
        })),
      }
    },

    async purgeHistory(input) {
      const repo = retentionRepo(db)
      await repo.deleteHistoryBefore(input.eventsBefore)
      return repo.finishedJobsBefore(input.succeededBefore, input.closedBefore)
    },
  }
}

function toOperatorRow(job: JobRow): OperatorJobRow {
  return {
    jobId: job.id,
    userId: job.userId,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    pipeline: ModelPlan.parse(job.models).pipeline,
    errorCode: job.errorCode,
    errorMessage: job.errorDetail?.message ?? null,
    attempts: job.attempts,
    spentMicros: job.spentMicros,
    budgetMicros: job.budgetMicros,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  }
}
