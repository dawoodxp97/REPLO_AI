import type { Budget } from '@replo/ai'
import { STAGES, type JobEventData, type Stage } from '@replo/contracts'
import type { Logger } from 'pino'
import type { JobRow } from '../modules/generation/generation.repo'
import type { JobStore } from '../modules/generation/job-runtime.service'
import { CanceledError, classifyError, JobError, StoppedError } from './errors'
import { GenerateTutorialPayload, MAX_ATTEMPTS, PROGRESS, STAGE_TIMEOUT_MS } from './schemas'
import { withTimeout } from './with-timeout'

export interface StageContext {
  job: JobRow
  payload: GenerateTutorialPayload
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
}

export async function handleGenerateTutorial(raw: unknown, deps: WorkerDeps): Promise<void> {
  const payload = GenerateTutorialPayload.parse(raw)
  const { jobs, log } = deps

  const job = await jobs.claim(payload.jobId)
  if (!job) {
    log.info({ jobId: payload.jobId }, 'job not claimable; skipping')
    return
  }
  const budget = deps.budgetFor(job)

  const cancel = new AbortController()
  const heartbeat = setInterval(async () => {
    try {
      const state = await jobs.heartbeat(job.id)
      if (state === 'canceling') cancel.abort(new CanceledError())
      if (state === 'stopped') cancel.abort(new StoppedError())
    } catch (err) {
      log.warn({ err, jobId: job.id }, 'heartbeat failed')
    }
  }, deps.heartbeatMs ?? 15_000)

  try {
    for (const stage of STAGES) {
      if (await jobs.isStageComplete(job.id, stage)) continue
      if (cancel.signal.aborted) throw new CanceledError()

      await jobs.setStage(job.id, stage)
      await jobs.emit(job.id, { type: 'stage_started', stage })

      const timeout = STAGE_TIMEOUT_MS[stage]
      await withTimeout(timeout, cancel.signal, (signal) =>
        deps.stageHandlers[stage]({
          job,
          payload,
          signal,
          budget,
          progress: async (data) => {
            await jobs.emit(job.id, { type: 'progress', stage, data })
          },
        }),
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
    await jobs.emit(job.id, { type: 'succeeded' })
  } catch (err) {
    if (cancel.signal.reason instanceof StoppedError) {
      log.info({ jobId: job.id }, 'job stopped by an external action; not finishing it')
      return
    }
    if (cancel.signal.reason instanceof CanceledError) {
      log.warn({ jobId: job.id, code: 'CANCELED', retryable: false }, 'job stage failed')
      await jobs.finish(job.id, 'canceled')
      await jobs.emit(job.id, { type: 'canceled' })
      return
    }
    const e = classifyError(err)
    log.warn({ jobId: job.id, code: e.code, retryable: e.retryable }, 'job stage failed')

    if (e.retryable && job.attempts < MAX_ATTEMPTS) {
      const retrying = await jobs.markWaitingRetry(job.id, e)
      if (!retrying) return
      await jobs.emit(job.id, { type: 'warning', data: { code: e.code, willRetry: true } })
      throw err instanceof Error ? err : new JobError(e.code, true)
    }
    await jobs.finish(job.id, 'failed', { code: e.code, detail: e.detail })
    await jobs.emit(job.id, { type: 'failed', data: { code: e.code } })
  } finally {
    clearInterval(heartbeat)
  }
}
