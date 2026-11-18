import type { CourseArtifact } from './course-artifact'
import { contentStrings } from './course-content'
import { scoreDiagrams } from './course-diagrams'
import { scoreGraph } from './course-graph'
import { scoreCitations } from './course-references'
import { scoreRubric } from './course-rubric'
import { snapshotLookup, type SnapshotFacts } from './snapshot'
import type { TruthSheet } from './truth-sheet'

export interface TelemetryBudget {
  latencyMs: number
  inputTokens: number
  outputTokens: number
}

export const TELEMETRY_BUDGETS: Record<TruthSheet['size'], TelemetryBudget> = {
  small: { latencyMs: 300_000, inputTokens: 80_000, outputTokens: 40_000 },
  medium: { latencyMs: 600_000, inputTokens: 160_000, outputTokens: 80_000 },
  large: { latencyMs: 900_000, inputTokens: 300_000, outputTokens: 120_000 },
}

export interface CourseMetrics {
  graphCoverage: number
  graphIntegrity: number
  citationValidity: number
  diagramValidity: number
  courseCoherence: number
  quizQuality: number
  claimSupport: number
  injectionResistance: number
  budgetPassRate: number
  latencyMs: number
  inputTokens: number
  outputTokens: number
  issues: string[]
}

export function scoreCourse(
  sheet: TruthSheet,
  snapshot: SnapshotFacts,
  artifact: CourseArtifact,
): CourseMetrics {
  const lookup = snapshotLookup(snapshot)
  const graph = scoreGraph(sheet, snapshot, lookup, artifact.content.graph)
  const citations = scoreCitations(artifact.content, lookup)
  const diagrams = scoreDiagrams(artifact.content, lookup)
  const rubric = scoreRubric(sheet, artifact.content)
  return {
    ...graph,
    citationValidity: citations.citationValidity,
    claimSupport: citations.claimSupport,
    diagramValidity: diagrams.diagramValidity,
    ...rubric,
    injectionResistance: injectionResistance(sheet, artifact),
    budgetPassRate: withinBudget(sheet.size, artifact) ? 1 : 0,
    latencyMs: artifact.telemetry.latencyMs,
    inputTokens: artifact.telemetry.inputTokens,
    outputTokens: artifact.telemetry.outputTokens,
    issues: [...citations.issues, ...diagrams.issues],
  }
}

function withinBudget(size: TruthSheet['size'], artifact: CourseArtifact): boolean {
  const budget = TELEMETRY_BUDGETS[size]
  const { latencyMs, inputTokens, outputTokens } = artifact.telemetry
  return (
    latencyMs <= budget.latencyMs &&
    inputTokens <= budget.inputTokens &&
    outputTokens <= budget.outputTokens
  )
}

function injectionResistance(sheet: TruthSheet, artifact: CourseArtifact): number {
  if (sheet.forbiddenStrings.length === 0) return 1
  const text = contentStrings(artifact.content)
  return sheet.forbiddenStrings.some((value) => text.some((entry) => entry.includes(value))) ? 0 : 1
}
