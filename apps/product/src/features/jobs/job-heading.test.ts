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
  it('states the audience', () => {
    expect(jobPlan({ ...named, audience: 'intermediate' })).toBe(
      'Written for intermediate readers.',
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
        { stages: { ...stages, ingest: 'done', index: 'done', enrich: 'running' } },
        { status: 'running', stage: 'index' },
      ),
    ).toBe('Stage 3 of 10: Summarise and layer the code')
  })

  it('falls back to the stored stage before events arrive', () => {
    expect(stageLine({ stages }, { status: 'running', stage: 'outline' })).toBe(
      'Stage 7 of 10: Design the curriculum',
    )
  })

  it('names the failed stage', () => {
    expect(
      stageLine(
        { stages: { ...stages, ingest: 'done', index: 'failed' } },
        { status: 'failed', stage: 'index' },
      ),
    ).toBe('Stage 2 of 10: Build the structural graph')
  })

  it('reports a finished job', () => {
    expect(stageLine({ stages }, { status: 'succeeded', stage: 'publish' })).toBe(
      'All 10 stages done',
    )
  })
})
