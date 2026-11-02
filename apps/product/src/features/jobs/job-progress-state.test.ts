import type { JobEventDto } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import {
  applyJobEvent,
  INITIAL_JOB_PROGRESS,
  isTerminalEvent,
  restartJobProgress,
  withConnection,
} from './job-progress-state'

const JOB_ID = '7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f'

function event(
  id: number,
  type: JobEventDto['type'],
  stage: JobEventDto['stage'] = null,
): JobEventDto {
  return { id, jobId: JOB_ID, type, stage, data: null, at: '2026-10-23T10:00:00.000Z' }
}

describe('applyJobEvent', () => {
  it('moves a stage through running to done', () => {
    const started = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'stage_started', 'ingest'))
    const completed = applyJobEvent(started, event(2, 'stage_completed', 'ingest'))
    expect(started.stages.ingest).toBe('running')
    expect(completed.stages.ingest).toBe('done')
    expect(completed.lastEventId).toBe(2)
  })

  it('ignores an event that was already applied, as a reconnect replays them', () => {
    const once = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'stage_started', 'ingest'))
    const replayed = applyJobEvent(once, event(1, 'stage_started', 'ingest'))
    expect(replayed).toBe(once)
  })

  it('does not let an older replayed completion overwrite a newer stage', () => {
    let progress = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'stage_started', 'ingest'))
    progress = applyJobEvent(progress, event(2, 'stage_completed', 'ingest'))
    progress = applyJobEvent(progress, event(3, 'stage_started', 'index'))
    progress = applyJobEvent(progress, event(2, 'stage_completed', 'ingest'))
    expect(progress.stages.index).toBe('running')
    expect(progress.lastEventId).toBe(3)
  })

  it('marks the running stage as failed and sets the terminal state', () => {
    let progress = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'stage_started', 'ingest'))
    progress = applyJobEvent(progress, event(2, 'stage_completed', 'ingest'))
    progress = applyJobEvent(progress, event(3, 'stage_started', 'index'))
    progress = applyJobEvent(progress, event(4, 'failed'))
    expect(progress.stages.index).toBe('failed')
    expect(progress.stages.ingest).toBe('done')
    expect(progress.terminal).toBe('failed')
  })

  it('records success and cancellation as terminal', () => {
    expect(applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'succeeded')).terminal).toBe('succeeded')
    expect(applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'canceled')).terminal).toBe('canceled')
  })

  it('keeps non-stage events without changing stages', () => {
    const progress = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'progress'))
    expect(progress.stages).toEqual(INITIAL_JOB_PROGRESS.stages)
    expect(progress.lastEventId).toBe(1)
  })
})

describe('retrying a job', () => {
  function failedAtIndex() {
    let progress = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'stage_started', 'ingest'))
    progress = applyJobEvent(progress, event(2, 'stage_completed', 'ingest'))
    progress = applyJobEvent(progress, event(3, 'stage_started', 'index'))
    return applyJobEvent(progress, event(4, 'failed'))
  }

  it('clears the failure when the retry queues the job again', () => {
    const retried = applyJobEvent(failedAtIndex(), event(5, 'queued'))
    expect(retried.terminal).toBeNull()
    expect(retried.stages.index).toBe('pending')
    expect(retried.stages.ingest).toBe('done')
  })

  it('does not disturb a job that is queued for the first time', () => {
    const progress = applyJobEvent(INITIAL_JOB_PROGRESS, event(1, 'queued'))
    expect(progress.stages).toEqual(INITIAL_JOB_PROGRESS.stages)
    expect(progress.terminal).toBeNull()
  })

  it('restarts locally and keeps the last event id so replayed events are ignored', () => {
    const restarted = restartJobProgress(failedAtIndex())
    expect(restarted.terminal).toBeNull()
    expect(restarted.connection).toBe('connecting')
    expect(restarted.stages.index).toBe('pending')
    expect(restarted.lastEventId).toBe(4)
    expect(applyJobEvent(restarted, event(4, 'failed'))).toBe(restarted)
  })
})

describe('withConnection', () => {
  it('returns the same object when the connection state does not change', () => {
    expect(withConnection(INITIAL_JOB_PROGRESS, 'connecting')).toBe(INITIAL_JOB_PROGRESS)
  })

  it('records a lost connection', () => {
    expect(withConnection(INITIAL_JOB_PROGRESS, 'lost').connection).toBe('lost')
  })
})

describe('isTerminalEvent', () => {
  it('identifies the three end states', () => {
    expect(isTerminalEvent('succeeded')).toBe(true)
    expect(isTerminalEvent('failed')).toBe(true)
    expect(isTerminalEvent('canceled')).toBe(true)
    expect(isTerminalEvent('stage_started')).toBe(false)
  })
})
