import type { Budget } from '@replo/ai'
import { STAGES, type JobEventData, type Stage } from '@replo/contracts'
import type { Logger } from 'pino'
import type { JobRow } from '../modules/jobs/jobs.repo'
import type { JobStore } from '../modules/jobs/job-runtime.service'
import { CanceledError, classifyError, JobError, StoppedError } from './errors'
import {
  GenerateTutorialPayload,
  MAX_ATTEMPTS,
  PROGRESS,
  STAGE_ABORT_GRACE_MS,
  STAGE_TIMEOUT_MS,
} from './job-payload'
import { withTimeout } from './with-timeout'

export interface StageContext {
  job: JobRow
  signal: AbortSignal
  budget: Budget
  progress(data: JobEventData): Promise<void>
}
export type StageHandler = (ctx: StageContext) => Promise<void>

export interface WorkerDeps {
  jobs: JobStore
  log: Logger
  budgetFor(job: JobRow): Budget
  stageHandlers: Record<Stage, StageHandler>
  heartbeatMs?: number
  abortGraceMs?: number
}

export async function handleGenerateTutorial(raw: unknown, deps: WorkerDeps): Promise<void> {
  const payload = GenerateTutorialPayload.parse(raw)
  const { jobs, log } = deps
  const abortGraceMs = deps.abortGraceMs ?? STAGE_ABORT_GRACE_MS

  const job = await jobs.claim(payload.jobId)
  if (!job) {
    log.info({ jobId: payload.jobId }, 'job not claimable; skipping')
    return
  }
  const budget = deps.budgetFor(job)

  const interrupt = new AbortController()
  const heartbeat = setInterval(async () => {
    try {
      const state = await jobs.heartbeat(job.id)
      if (state === 'canceling') interrupt.abort(new CanceledError())
      if (state === 'stopped') interrupt.abort(new StoppedError())
    } catch (err) {
      log.warn({ err, jobId: job.id }, 'heartbeat failed')
    }
  }, deps.heartbeatMs ?? 15_000)

  try {
    for (const stage of STAGES) {
      // Resuming after a crash or a retry: stages finished by an earlier attempt are not run again.
      if (await jobs.isStageComplete(job.id, stage)) continue
      if (interrupt.signal.aborted) throw new CanceledError()

      await jobs.setStage(job.id, stage)
      await jobs.emit(job.id, { type: 'stage_started', stage })

      const timeout = STAGE_TIMEOUT_MS[stage]
      await withTimeout(
        timeout,
        interrupt.signal,
        (signal) =>
          deps.stageHandlers[stage]({
            job,
            signal,
            budget,
            progress: async (data) => {
              await jobs.emit(job.id, { type: 'progress', stage, data })
            },
          }),
        abortGraceMs,
      )

      await jobs.completeStage(job.id, stage)
      await jobs.setStage(job.id, stage, PROGRESS[stage])
      await jobs.emit(job.id, {
        type: 'stage_completed',
        stage,
        data: { progress: PROGRESS[stage] },
      })
    }
    await jobs.finish(job.id, 'succeeded')
  } catch (err) {
    if (err instanceof StoppedError || interrupt.signal.reason instanceof StoppedError) {
      // Someone else owns the outcome now (a key deletion ended the job, or the reaper
      // gave it to a newer attempt); writing a status here would overwrite theirs.
      log.info({ jobId: job.id }, 'job stopped by an external action; not finishing it')
      return
    }
    if (err instanceof CanceledError || interrupt.signal.reason instanceof CanceledError) {
      log.warn({ jobId: job.id, code: 'CANCELED', retryable: false }, 'job stage failed')
      await jobs.finish(job.id, 'canceled')
      return
    }
    const failure = classifyError(err)
    log.warn(
      { jobId: job.id, code: failure.code, retryable: failure.retryable },
      'job stage failed',
    )

    if (failure.retryable && job.attempts < MAX_ATTEMPTS) {
      const retrying = await jobs.markWaitingRetry(job.id, failure)
      if (!retrying) return
      await jobs.emit(job.id, { type: 'warning', data: { code: failure.code, willRetry: true } })
      // Rethrowing hands the retry to pg-boss, which redelivers with backoff (declareQueues).
      // On the last attempt nothing redelivers, so the job fails below instead.
      throw err instanceof Error ? err : new JobError(failure.code, true)
    }
    await jobs.finish(job.id, 'failed', { code: failure.code, detail: failure.detail })
  } finally {
    clearInterval(heartbeat)
  }
}
