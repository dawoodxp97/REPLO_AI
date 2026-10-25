import type { JobEventDto, Stage } from '@replo/contracts'

export type StageState = 'pending' | 'running' | 'done' | 'failed'
export type Connection = 'connecting' | 'live' | 'lost'
export type TerminalEvent = 'succeeded' | 'failed' | 'canceled'

export interface JobProgress {
  stages: Record<Stage, StageState>
  lastEventId: number
  terminal: TerminalEvent | null
  connection: Connection
}

export const INITIAL_JOB_PROGRESS: JobProgress = {
  stages: {
    ingest: 'pending',
    index: 'pending',
    summaries: 'pending',
    architecture: 'pending',
    outline: 'pending',
    lessons: 'pending',
    validate: 'pending',
    publish: 'pending',
  },
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

  switch (event.type) {
    case 'stage_started':
      return event.stage
        ? { ...advanced, stages: setStage(progress.stages, event.stage, 'running') }
        : advanced
    case 'stage_completed':
      return event.stage
        ? { ...advanced, stages: setStage(progress.stages, event.stage, 'done') }
        : advanced
    case 'failed':
      return {
        ...advanced,
        stages: mapStages(progress.stages, (state) => (state === 'running' ? 'failed' : state)),
        terminal: 'failed',
      }
    case 'succeeded':
    case 'canceled':
      return { ...advanced, terminal: event.type }
    default:
      return advanced
  }
}

export function withConnection(progress: JobProgress, connection: Connection): JobProgress {
  return progress.connection === connection ? progress : { ...progress, connection }
}

function setStage(
  stages: Record<Stage, StageState>,
  stage: Stage,
  state: StageState,
): Record<Stage, StageState> {
  return mapStages(stages, (current, name) => (name === stage ? state : current))
}

function mapStages(
  stages: Record<Stage, StageState>,
  change: (state: StageState, stage: Stage) => StageState,
): Record<Stage, StageState> {
  return {
    ingest: change(stages.ingest, 'ingest'),
    index: change(stages.index, 'index'),
    summaries: change(stages.summaries, 'summaries'),
    architecture: change(stages.architecture, 'architecture'),
    outline: change(stages.outline, 'outline'),
    lessons: change(stages.lessons, 'lessons'),
    validate: change(stages.validate, 'validate'),
    publish: change(stages.publish, 'publish'),
  }
}
