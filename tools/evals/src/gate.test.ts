import { describe, expect, it } from 'vitest'
import { decideAllowList, gateFailures, type ModelSummary } from './gate'

const passing: ModelSummary = {
  model: 'good',
  calls: 10,
  schemaValidRate: 1,
  referenceValidityPre: 1,
  entryRecall: 0.9,
  fabricatedPerCall: 0,
  costUsd: 0,
  latencyMs: 0,
}

describe('gateFailures', () => {
  it('passes a model that clears every threshold', () => {
    expect(gateFailures(passing)).toEqual([])
  })

  it('names each threshold a model misses', () => {
    const failures = gateFailures({ ...passing, referenceValidityPre: 0.5, fabricatedPerCall: 1 })
    expect(failures).toHaveLength(2)
    expect(failures[0]).toContain('referenceValidityPre')
    expect(failures[1]).toContain('fabricatedPerCall')
  })
})

describe('decideAllowList', () => {
  const weak: ModelSummary = { ...passing, model: 'weak', referenceValidityPre: 0 }

  it('enters a passing model that is not listed yet', () => {
    expect(decideAllowList([], [passing]).enter).toEqual(['good'])
  })

  it('leaves a listed model that fails the gate', () => {
    expect(decideAllowList(['weak'], [weak]).leave).toEqual(['weak'])
  })

  it('keeps a listed model that passes, and does not enter it twice', () => {
    const decision = decideAllowList(['good'], [passing])
    expect(decision.enter).toEqual([])
    expect(decision.keep).toEqual(['good'])
  })

  it('keeps listed models that were not evaluated in this run', () => {
    expect(decideAllowList(['unseen'], [passing]).keep).toContain('unseen')
  })

  it('reports why each model was judged', () => {
    expect(decideAllowList([], [weak]).reasons.weak?.length).toBeGreaterThan(0)
  })
})
