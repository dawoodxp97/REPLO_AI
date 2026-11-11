import { describe, expect, it } from 'vitest'
import { INITIAL_JOB_PROGRESS } from './job-progress-state'
import { jobPlan, jobTitle, stageLine, UNNAMED_JOB_TITLE } from './job-heading'

const named = { repository: { owner: 'acme', name: 'widgets' } }

describe('jobTitle', () => {
  it('names the repository', () => {
    expect(jobTitle(named)).toBe('acme/widgets')
  })

  it('falls back when the repository is no longer linked', () => {
    expect(jobTitle({ repository: null })).toBe(UNNAMED_JOB_TITLE)
  })
})

describe('jobPlan', () => {
  it('states the preset and the audience', () => {
    expect(jobPlan({ ...named, preset: 'balanced', audience: 'intermediate' })).toBe(
      'Balanced preset, written for intermediate readers.',
    )
  })

  it('omits an unknown preset', () => {
    expect(jobPlan({ ...named, preset: null, audience: 'expert' })).toBe(
      'Written for expert readers.',
    )
  })
})

describe('stageLine', () => {
  const stages = { ...INITIAL_JOB_PROGRESS.stages }

  it('waits for a queued job', () => {
    expect(stageLine({ stages }, { status: 'queued', stage: null })).toBe('Waiting to start')
  })

  it('counts the running stage from the live feed', () => {
    expect(
      stageLine(
        { stages: { ...stages, ingest: 'done', index: 'done', summaries: 'running' } },
        { status: 'running', stage: 'index' },
      ),
    ).toBe('Stage 3 of 8: Summarise central files')
  })

  it('falls back to the stored stage before events arrive', () => {
    expect(stageLine({ stages }, { status: 'running', stage: 'outline' })).toBe(
      'Stage 5 of 8: Design the curriculum',
    )
  })

  it('names the failed stage', () => {
    expect(
      stageLine(
        { stages: { ...stages, ingest: 'done', index: 'failed' } },
        { status: 'failed', stage: 'index' },
      ),
    ).toBe('Stage 2 of 8: Build static index')
  })

  it('reports a finished job', () => {
    expect(stageLine({ stages }, { status: 'succeeded', stage: 'publish' })).toBe(
      'All 8 stages done',
    )
  })
})
