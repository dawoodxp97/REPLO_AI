import type { ValidationReport } from '@replo/contracts'
import type { GroundedLesson } from './lesson'

export const DRAFT_CONFIDENCE = 0.8

export interface LessonOutcome {
  lessonKey: string
  first: GroundedLesson
  final: GroundedLesson
  repaired: boolean
}

export function buildReport(
  outcomes: readonly LessonOutcome[],
  judgeScores: readonly number[],
): ValidationReport {
  const claims = sum(outcomes.map((outcome) => outcome.final.claims.total))
  const supported = sum(outcomes.map((outcome) => outcome.final.claims.supported))
  const references = sum(outcomes.map((outcome) => outcome.first.references.total))
  const resolved = sum(outcomes.map((outcome) => outcome.first.references.resolved))
  const judgeScore = judgeScores.length > 0 ? round(sum(judgeScores) / judgeScores.length) : null
  const verifiedClaimRatio = claims === 0 ? 1 : round(Math.min(1, supported / claims))
  const confidence = round(verifiedClaimRatio * (judgeScore ?? 1))
  const emptyLessons = outcomes.filter((outcome) => outcome.final.lesson.blocks.length === 0)

  return {
    referenceValidity: references === 0 ? 1 : round(resolved / references),
    verifiedClaimRatio,
    judgeScore,
    confidence,
    fabricatedIdentifiers: sum(outcomes.map((outcome) => outcome.first.fabricated)),
    repairs: outcomes.filter((outcome) => outcome.repaired).length,
    draft: confidence < DRAFT_CONFIDENCE || emptyLessons.length > 0,
    issues: [
      ...emptyLessons.map((outcome) => ({
        lessonKey: outcome.lessonKey,
        code: 'EMPTY_LESSON',
        detail: 'every block was removed by grounding',
      })),
      ...outcomes.flatMap((outcome) =>
        outcome.final.failures.map((failure) => ({
          lessonKey: outcome.lessonKey,
          code: failure.code,
          detail: `${failure.location}: ${failure.detail}`,
        })),
      ),
    ].slice(0, 200),
  }
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
