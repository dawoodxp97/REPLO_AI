import type { CourseMetrics } from './course-score'
import type { ProbeScore } from './probe'
import { mean, minimum } from './statistics'

export interface ProbeSummary {
  model: string
  calls: number
  schemaValidRate: number
  referenceValidityPre: number
  entryRecall: number
  fabricatedPerCall: number
  costUsd: number
  latencyMs: number
}

export interface CourseSummary {
  model: string
  artifacts: number
  expected: number
  graphCoverage: number
  graphIntegrity: number
  citationValidity: number
  diagramValidity: number
  courseCoherence: number
  quizQuality: number
  claimSupport: number
  injectionResistance: number
  budgetPassRate: number
  minimumGraphCoverage: number
  minimumGraphIntegrity: number
  minimumCitationValidity: number
  minimumDiagramValidity: number
  minimumCourseCoherence: number
  minimumQuizQuality: number
  minimumClaimSupport: number
  minimumInjectionResistance: number
  minimumBudgetPassRate: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  issues: number
}

export interface ModelEvaluation {
  model: string
  probe: ProbeSummary | null
  course: CourseSummary | null
  probeScores?: { repo: string; score: ProbeScore }[]
  courseScores?: { repo: string; metrics: CourseMetrics }[]
}

export function summarizeProbe(model: string, scores: readonly ProbeScore[]): ProbeSummary {
  return {
    model,
    calls: scores.length,
    schemaValidRate: mean(scores.map((score) => score.schemaValid)),
    referenceValidityPre: mean(scores.map((score) => score.referenceValidityPre)),
    entryRecall: mean(scores.map((score) => score.entryRecall)),
    fabricatedPerCall: mean(scores.map((score) => score.fabricatedPaths)),
    costUsd: scores.reduce((sum, score) => sum + score.costUsd, 0),
    latencyMs: mean(scores.map((score) => score.latencyMs)),
  }
}

export function summarizeCourse(
  model: string,
  expected: number,
  metrics: readonly CourseMetrics[],
): CourseSummary {
  return {
    model,
    artifacts: metrics.length,
    expected,
    graphCoverage: mean(metrics.map((entry) => entry.graphCoverage)),
    graphIntegrity: mean(metrics.map((entry) => entry.graphIntegrity)),
    citationValidity: mean(metrics.map((entry) => entry.citationValidity)),
    diagramValidity: mean(metrics.map((entry) => entry.diagramValidity)),
    courseCoherence: mean(metrics.map((entry) => entry.courseCoherence)),
    quizQuality: mean(metrics.map((entry) => entry.quizQuality)),
    claimSupport: mean(metrics.map((entry) => entry.claimSupport)),
    injectionResistance: mean(metrics.map((entry) => entry.injectionResistance)),
    budgetPassRate: mean(metrics.map((entry) => entry.budgetPassRate)),
    minimumGraphCoverage: minimum(metrics.map((entry) => entry.graphCoverage)),
    minimumGraphIntegrity: minimum(metrics.map((entry) => entry.graphIntegrity)),
    minimumCitationValidity: minimum(metrics.map((entry) => entry.citationValidity)),
    minimumDiagramValidity: minimum(metrics.map((entry) => entry.diagramValidity)),
    minimumCourseCoherence: minimum(metrics.map((entry) => entry.courseCoherence)),
    minimumQuizQuality: minimum(metrics.map((entry) => entry.quizQuality)),
    minimumClaimSupport: minimum(metrics.map((entry) => entry.claimSupport)),
    minimumInjectionResistance: minimum(metrics.map((entry) => entry.injectionResistance)),
    minimumBudgetPassRate: minimum(metrics.map((entry) => entry.budgetPassRate)),
    latencyMs: mean(metrics.map((entry) => entry.latencyMs)),
    inputTokens: mean(metrics.map((entry) => entry.inputTokens)),
    outputTokens: mean(metrics.map((entry) => entry.outputTokens)),
    issues: metrics.reduce((sum, entry) => sum + entry.issues.length, 0),
  }
}
