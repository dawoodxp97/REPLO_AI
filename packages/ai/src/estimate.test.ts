import { describe, expect, it } from 'vitest'
import { estimateRun } from './estimate'

const cheap = { inputUsdPerMTok: 0.1, outputUsdPerMTok: 0.5 }
const mid = { inputUsdPerMTok: 2, outputUsdPerMTok: 10 }

describe('estimateRun', () => {
  it('uses the lite shape for lite runs', () => {
    const run = estimateRun({
      pipeline: 'lite',
      totalBytes: 10_000_000,
      roles: { planner: cheap, author: cheap, summarizer: cheap },
    })
    expect(run.requests).toBe(12)
  })

  it('costs a run in whole micro-dollars from per-role prices', () => {
    const run = estimateRun({
      pipeline: 'lite',
      totalBytes: 3_500,
      roles: { planner: mid, author: mid, summarizer: null },
    })
    expect(run.costMicros).toBeGreaterThan(0)
    expect(Number.isInteger(run.costMicros)).toBe(true)
  })

  it('caps the context per request, so a huge repo does not scale the input linearly', () => {
    const roles = { planner: mid, author: mid, summarizer: mid }
    const large = estimateRun({ pipeline: 'full', totalBytes: 1_000_000, roles })
    const huge = estimateRun({ pipeline: 'full', totalBytes: 500_000_000, roles })
    expect(huge.inputTokens).toBe(large.inputTokens)
  })

  it('bills a role without a model as nothing', () => {
    const withSummary = estimateRun({
      pipeline: 'lite',
      totalBytes: 100_000,
      roles: { planner: cheap, author: cheap, summarizer: cheap },
    })
    const withoutSummary = estimateRun({
      pipeline: 'lite',
      totalBytes: 100_000,
      roles: { planner: cheap, author: cheap, summarizer: null },
    })
    expect(withoutSummary.costMicros).toBeLessThan(withSummary.costMicros)
  })
})
