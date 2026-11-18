import { describe, expect, it } from 'vitest'
import { decideAllowList, gateFailures } from './gate'
import type { CourseSummary, ModelEvaluation, ProbeSummary } from './summary'

const probe: ProbeSummary = {
  model: 'good',
  calls: 10,
  schemaValidRate: 1,
  referenceValidityPre: 1,
  entryRecall: 0.9,
  fabricatedPerCall: 0,
  costUsd: 0,
  latencyMs: 0,
}

const course: CourseSummary = {
  model: 'good',
  artifacts: 10,
  expected: 10,
  graphCoverage: 1,
  graphIntegrity: 1,
  citationValidity: 1,
  diagramValidity: 1,
  courseCoherence: 1,
  quizQuality: 1,
  claimSupport: 1,
  injectionResistance: 1,
  budgetPassRate: 1,
  minimumGraphCoverage: 1,
  minimumGraphIntegrity: 1,
  minimumCitationValidity: 1,
  minimumDiagramValidity: 1,
  minimumCourseCoherence: 1,
  minimumQuizQuality: 1,
  minimumClaimSupport: 1,
  minimumInjectionResistance: 1,
  minimumBudgetPassRate: 1,
  latencyMs: 0,
  inputTokens: 0,
  outputTokens: 0,
  issues: 0,
}

const evaluation = (overrides: Partial<ModelEvaluation> = {}): ModelEvaluation => ({
  model: 'good',
  probe,
  course,
  ...overrides,
})

describe('gateFailures', () => {
  it('passes a model that clears every probe and course threshold', () => {
    expect(gateFailures(evaluation())).toEqual([])
  })

  it('fails a model without probe or course evidence', () => {
    expect(gateFailures(evaluation({ probe: null }))).toContain('probe metrics missing')
    expect(gateFailures(evaluation({ course: null }))).toContain('course metrics missing')
  })

  it('names each probe threshold a model misses', () => {
    const failures = gateFailures(
      evaluation({ probe: { ...probe, referenceValidityPre: 0.5, fabricatedPerCall: 1 } }),
    )
    expect(failures).toHaveLength(2)
    expect(failures[0]).toContain('referenceValidityPre')
    expect(failures[1]).toContain('fabricatedPerCall')
  })

  it('requires every course artifact and a perfect citation and diagram record', () => {
    const failures = gateFailures(
      evaluation({
        course: {
          ...course,
          artifacts: 9,
          minimumCitationValidity: 0.99,
          minimumDiagramValidity: 0.9,
        },
      }),
    )
    expect(failures[0]).toContain('course artifacts 9 of 10')
    expect(failures.some((failure) => failure.includes('minimumCitationValidity'))).toBe(true)
    expect(failures.some((failure) => failure.includes('minimumDiagramValidity'))).toBe(true)
  })
})

describe('decideAllowList', () => {
  const weak = evaluation({
    model: 'weak',
    probe: { ...probe, model: 'weak', referenceValidityPre: 0 },
  })

  it('enters a passing model that is not listed yet', () => {
    expect(decideAllowList([], [evaluation()]).enter).toEqual(['good'])
  })

  it('leaves a listed model that fails the gate', () => {
    expect(decideAllowList(['weak'], [weak]).leave).toEqual(['weak'])
  })

  it('keeps a listed model that passes, and does not enter it twice', () => {
    const decision = decideAllowList(['good'], [evaluation()])
    expect(decision.enter).toEqual([])
    expect(decision.keep).toEqual(['good'])
  })

  it('keeps listed models that were not evaluated in this run', () => {
    expect(decideAllowList(['unseen'], [evaluation()]).keep).toContain('unseen')
  })

  it('reports why each model was judged', () => {
    expect(decideAllowList([], [weak]).reasons.weak?.length).toBeGreaterThan(0)
  })
})
