import { describe, expect, it } from 'vitest'
import type { GroundedLesson } from './lesson'
import { buildReport, DRAFT_CONFIDENCE, type LessonOutcome } from './report'

const grounded = (overrides: Partial<GroundedLesson> = {}): GroundedLesson => ({
  lesson: {
    key: 'l',
    title: 'L',
    minutes: 3,
    blocks: [{ type: 'callout', tone: 'note', md: 'x' }],
    quiz: [],
  },
  refs: {},
  failures: [],
  claims: { total: 0, supported: 0 },
  references: { total: 0, resolved: 0 },
  fabricated: 0,
  ...overrides,
})

const outcome = (
  first: GroundedLesson,
  final: GroundedLesson = first,
  repaired = false,
): LessonOutcome => ({
  lessonKey: first.lesson.key,
  first,
  final,
  repaired,
})

describe('buildReport', () => {
  it('reports reference validity before validation and claim support after it', () => {
    const first = grounded({
      claims: { total: 4, supported: 2 },
      references: { total: 5, resolved: 4 },
      fabricated: 1,
    })
    const final = grounded({ claims: { total: 4, supported: 3 } })
    const report = buildReport([outcome(first, final, true)], [])

    expect(report).toMatchObject({
      referenceValidity: 0.8,
      verifiedClaimRatio: 0.75,
      judgeScore: null,
      confidence: 0.75,
      fabricatedIdentifiers: 1,
      repairs: 1,
      draft: true,
    })
  })

  it('measures claim support against the final pass only', () => {
    const first = grounded({
      claims: { total: 4, supported: 4 },
      references: { total: 1, resolved: 1 },
    })
    const final = grounded({ claims: { total: 2, supported: 2 } })
    const report = buildReport([outcome(first, final, true)], [])
    expect(report.verifiedClaimRatio).toBe(1)
  })

  it('multiplies the claim ratio by the mean judge score', () => {
    const lesson = grounded({
      claims: { total: 2, supported: 2 },
      references: { total: 2, resolved: 2 },
    })
    const report = buildReport([outcome(lesson)], [0.5, 1])
    expect(report.judgeScore).toBe(0.75)
    expect(report.confidence).toBe(0.75)
    expect(report.draft).toBe(true)
  })

  it('publishes without a draft flag when confidence clears the threshold', () => {
    const lesson = grounded({
      claims: { total: 10, supported: 9 },
      references: { total: 9, resolved: 9 },
    })
    const report = buildReport([outcome(lesson)], [])
    expect(report.confidence).toBeGreaterThanOrEqual(DRAFT_CONFIDENCE)
    expect(report.draft).toBe(false)
  })

  it('flags empty lessons and lists every remaining failure', () => {
    const empty = grounded({
      lesson: { key: 'empty', title: 'E', minutes: 1, blocks: [], quiz: [] },
      failures: [{ code: 'INVALID_DIAGRAM', location: 'block:0', detail: 'NO_VERIFIED_HOPS' }],
    })
    const report = buildReport([outcome(empty)], [])
    expect(report.draft).toBe(true)
    expect(report.issues).toEqual([
      { lessonKey: 'empty', code: 'EMPTY_LESSON', detail: 'every block was removed by grounding' },
      { lessonKey: 'empty', code: 'INVALID_DIAGRAM', detail: 'block:0: NO_VERIFIED_HOPS' },
    ])
  })
})
