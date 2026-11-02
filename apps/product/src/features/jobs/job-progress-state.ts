import { STAGES, type JobEventDto, type Stage } from '@replo/contracts'

export type StageState = 'pending' | 'running' | 'done' | 'failed'
export type Connection = 'connecting' | 'live' | 'lost' | 'closed'
export type TerminalEvent = 'succeeded' | 'failed' | 'canceled'

export interface StageTiming {
  startedAt: number | null
  endedAt: number | null
}

export interface JobProgress {
  stages: Record<Stage, StageState>
  timings: Record<Stage, StageTiming>
  lastEventId: number
  terminal: TerminalEvent | null
  connection: Connection
}

export function buildStages<T>(build: (stage: Stage) => T): Record<Stage, T> {
  return Object.fromEntries(STAGES.map((stage) => [stage, build(stage)])) as Record<Stage, T>
}

const NO_TIMING: StageTiming = { startedAt: null, endedAt: null }

export const INITIAL_JOB_PROGRESS: JobProgress = {
  stages: buildStages(() => 'pending'),
  timings: buildStages(() => NO_TIMING),
  lastEventId: 0,
  terminal: null,
  connection: 'connecting',
}

const TERMINAL_EVENTS: readonly TerminalEvent[] = ['succeeded', 'failed', 'canceled']

export function isTerminalEvent(type: JobEventDto['type']): type is TerminalEvent {
  return TERMINAL_EVENTS.some((terminal) => terminal === type)
}

export function applyJobEvent(progress: JobProgress, event: JobEventDto): JobProgress {
  if (event.id <= progress.lastEventId) return progress
  const advanced: JobProgress = { ...progress, lastEventId: event.id }
  const at = Date.parse(event.at)

  switch (event.type) {
    case 'queued':
      return progress.terminal === null ? advanced : withoutFailure(advanced)
    case 'stage_started':
      return event.stage
        ? withStage(advanced, event.stage, 'running', { startedAt: at, endedAt: null })
        : advanced
    case 'stage_completed':
      return event.stage ? withStage(advanced, event.stage, 'done', { endedAt: at }) : advanced
    case 'failed':
      return {
        ...advanced,
        stages: buildStages((stage) =>
          progress.stages[stage] === 'running' ? 'failed' : progress.stages[stage],
        ),
        timings: buildStages((stage) =>
          progress.stages[stage] === 'running'
            ? { ...progress.timings[stage], endedAt: at }
            : progress.timings[stage],
        ),
        terminal: 'failed',
      }
    case 'canceled':
      return { ...interruptRunning(advanced), terminal: 'canceled' }
    case 'succeeded':
      return { ...advanced, terminal: 'succeeded' }
    default:
      return advanced
  }
}

export function restartJobProgress(progress: JobProgress): JobProgress {
  return { ...withoutFailure(progress), connection: 'connecting' }
}

function withoutFailure(progress: JobProgress): JobProgress {
  return { ...interruptRunning(progress, 'failed'), terminal: null }
}

export function withConnection(progress: JobProgress, connection: Connection): JobProgress {
  return progress.connection === connection ? progress : { ...progress, connection }
}

function withStage(
  progress: JobProgress,
  stage: Stage,
  state: StageState,
  timing: Partial<StageTiming>,
): JobProgress {
  return {
    ...progress,
    stages: { ...progress.stages, [stage]: state },
    timings: { ...progress.timings, [stage]: { ...progress.timings[stage], ...timing } },
  }
}

function interruptRunning(progress: JobProgress, also?: StageState): JobProgress {
  const interrupted = (stage: Stage) =>
    progress.stages[stage] === 'running' || progress.stages[stage] === also
  return {
    ...progress,
    stages: buildStages((stage) => (interrupted(stage) ? 'pending' : progress.stages[stage])),
    timings: buildStages((stage) => (interrupted(stage) ? NO_TIMING : progress.timings[stage])),
  }
}
