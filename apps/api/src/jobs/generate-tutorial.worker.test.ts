import { Budget } from '@replo/ai'
import { STAGES, type Stage } from '@replo/contracts'
import { describe, expect, it, vi } from 'vitest'
import { JobError } from './errors'
import {
  handleGenerateTutorial,
  type StageHandler,
  type WorkerDeps,
} from './generate-tutorial.worker'

const JOB_ID = '0198f2c0-0000-7000-8000-000000000001'
const payload = {
  v: 1,
  jobId: JOB_ID,
  userId: 'u1',
  snapshotId: '0198f2c0-0000-7000-8000-000000000002',
  audience: 'intermediate',
}

function fakeDeps(
  opts: {
    claimable?: boolean
    completed?: string[]
    handlers?: Partial<Record<Stage, StageHandler>>
    attempts?: number
  } = {},
) {
  const completed = new Set(opts.completed ?? [])
  const events: string[] = []
  const finished: Array<{ status: string; code?: string }> = []
  const retries: string[] = []
  const ok: StageHandler = async () => {}
  const handlers = Object.fromEntries(STAGES.map((s) => [s, opts.handlers?.[s] ?? ok])) as Record<
    Stage,
    StageHandler
  >

  const jobs = {
    claim: vi.fn(async () =>
      opts.claimable === false
        ? undefined
        : ({ id: JOB_ID, attempts: opts.attempts ?? 1, userId: 'u1' } as never),
    ),
    heartbeat: vi.fn(async (): Promise<'ok' | 'canceling' | 'stopped'> => 'ok'),
    setStage: vi.fn(async () => {}),
    isStageComplete: vi.fn(async (_id: string, stage: string) => completed.has(stage)),
    completeStage: vi.fn(async (_id: string, stage: string) => void completed.add(stage)),
    emit: vi.fn(
      async (_id: string, e: { type: string; stage?: string | null }) =>
        void events.push(e.stage ? `${e.type}:${e.stage}` : e.type),
    ),
    finish: vi.fn(
      async (_id: string, status: string, error?: { code: string }) =>
        void finished.push({ status, ...(error ? { code: error.code } : {}) }),
    ),
    markWaitingRetry: vi.fn(async (_id: string, e: { code: string }) => {
      retries.push(e.code)
      return true
    }),
  }
  const log = { info: vi.fn(), warn: vi.fn() }
  const deps = {
    jobs,
    log,
    stageHandlers: handlers,
    heartbeatMs: 10_000,
    budgetFor: () => new Budget(1_000_000, async () => undefined),
  } as unknown as WorkerDeps
  return { deps, jobs, events, finished, retries, completed }
}

describe('handleGenerateTutorial', () => {
  it('runs every stage in order and succeeds', async () => {
    const t = fakeDeps()
    await handleGenerateTutorial(payload, t.deps)
    expect(
      t.events.filter((e) => e.startsWith('stage_started')).map((e) => e.split(':')[1]),
    ).toEqual([...STAGES])
    expect(t.finished).toEqual([{ status: 'succeeded' }])
  })

  it('no-ops on a duplicate delivery (job not claimable)', async () => {
    const t = fakeDeps({ claimable: false })
    await handleGenerateTutorial(payload, t.deps)
    expect(t.jobs.setStage).not.toHaveBeenCalled()
    expect(t.finished).toEqual([])
  })

  it('resumes from the last checkpoint (completed stages are skipped)', async () => {
    const seen: string[] = []
    const track =
      (s: string): StageHandler =>
      async () =>
        void seen.push(s)
    const t = fakeDeps({
      completed: ['ingest', 'index', 'summaries'],
      handlers: Object.fromEntries(STAGES.map((s) => [s, track(s)])) as Record<Stage, StageHandler>,
    })
    await handleGenerateTutorial(payload, t.deps)
    expect(seen).toEqual(['architecture', 'outline', 'lessons', 'validate', 'publish'])
  })

  it('fails terminally on a non-retryable error and stops', async () => {
    const t = fakeDeps({
      handlers: {
        index: async () => {
          throw new JobError('REPO_TOO_LARGE', false)
        },
      },
    })
    await handleGenerateTutorial(payload, t.deps)
    expect(t.finished).toEqual([{ status: 'failed', code: 'REPO_TOO_LARGE' }])
    expect(t.events).not.toContain('stage_started:summaries')
  })

  it('hands retryable errors back to the queue for backoff', async () => {
    const t = fakeDeps({
      handlers: {
        lessons: async () => {
          throw new JobError('PROVIDER_UNAVAILABLE', true)
        },
      },
    })
    await expect(handleGenerateTutorial(payload, t.deps)).rejects.toThrow()
    expect(t.retries).toEqual(['PROVIDER_UNAVAILABLE'])
    expect(t.finished).toEqual([])
  })

  it('fails (does not retry forever) once attempts are exhausted', async () => {
    const t = fakeDeps({
      attempts: 99,
      handlers: {
        lessons: async () => {
          throw new JobError('PROVIDER_UNAVAILABLE', true)
        },
      },
    })
    await handleGenerateTutorial(payload, t.deps)
    expect(t.finished).toEqual([{ status: 'failed', code: 'PROVIDER_UNAVAILABLE' }])
  })

  it('stops without finishing the job when another action already finished it (key removed)', async () => {
    const waitForStop: StageHandler = ({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    const t = fakeDeps({ handlers: { lessons: waitForStop } })
    t.jobs.heartbeat.mockImplementation(async () => 'stopped' as const)
    Object.assign(t.deps, { heartbeatMs: 1 })
    await expect(handleGenerateTutorial(payload, t.deps)).resolves.toBeUndefined()
    expect(t.finished).toEqual([])
    expect(t.retries).toEqual([])
  })

  it('rejects malformed queued payloads', async () => {
    const t = fakeDeps()
    await expect(handleGenerateTutorial({ v: 2 }, t.deps)).rejects.toThrow()
  })
})
