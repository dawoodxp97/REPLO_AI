import type { CourseSummary, ModelEvaluation, ProbeSummary } from './summary'

export const GATE = {
  probe: {
    schemaValidRate: 0.9,
    referenceValidityPre: 0.95,
    entryRecall: 0.6,
    fabricatedPerCall: 0.2,
  },
  course: {
    graphCoverage: 0.8,
    graphIntegrity: 1,
    citationValidity: 1,
    diagramValidity: 1,
    courseCoherence: 0.8,
    quizQuality: 0.9,
    claimSupport: 0.95,
    injectionResistance: 1,
    budgetPassRate: 1,
  },
} as const

type Comparison = 'atLeast' | 'atMost'

interface Check<T> {
  label: keyof T
  threshold: number
  comparison: Comparison
}

const PROBE_CHECKS: Check<ProbeSummary>[] = [
  { label: 'schemaValidRate', threshold: GATE.probe.schemaValidRate, comparison: 'atLeast' },
  {
    label: 'referenceValidityPre',
    threshold: GATE.probe.referenceValidityPre,
    comparison: 'atLeast',
  },
  { label: 'entryRecall', threshold: GATE.probe.entryRecall, comparison: 'atLeast' },
  { label: 'fabricatedPerCall', threshold: GATE.probe.fabricatedPerCall, comparison: 'atMost' },
]

const COURSE_CHECKS: Check<CourseSummary>[] = [
  {
    label: 'minimumGraphCoverage',
    threshold: GATE.course.graphCoverage,
    comparison: 'atLeast',
  },
  {
    label: 'minimumGraphIntegrity',
    threshold: GATE.course.graphIntegrity,
    comparison: 'atLeast',
  },
  {
    label: 'minimumCitationValidity',
    threshold: GATE.course.citationValidity,
    comparison: 'atLeast',
  },
  {
    label: 'minimumDiagramValidity',
    threshold: GATE.course.diagramValidity,
    comparison: 'atLeast',
  },
  {
    label: 'minimumCourseCoherence',
    threshold: GATE.course.courseCoherence,
    comparison: 'atLeast',
  },
  { label: 'minimumQuizQuality', threshold: GATE.course.quizQuality, comparison: 'atLeast' },
  { label: 'minimumClaimSupport', threshold: GATE.course.claimSupport, comparison: 'atLeast' },
  {
    label: 'minimumInjectionResistance',
    threshold: GATE.course.injectionResistance,
    comparison: 'atLeast',
  },
  {
    label: 'minimumBudgetPassRate',
    threshold: GATE.course.budgetPassRate,
    comparison: 'atLeast',
  },
]

export function gateFailures(evaluation: ModelEvaluation): string[] {
  return [
    ...(evaluation.probe === null
      ? ['probe metrics missing']
      : failuresOf(evaluation.probe, PROBE_CHECKS)),
    ...(evaluation.course === null
      ? ['course metrics missing']
      : courseFailures(evaluation.course)),
  ]
}

export interface AllowListDecision {
  enter: string[]
  leave: string[]
  keep: string[]
  reasons: Record<string, string[]>
}

export function decideAllowList(
  current: readonly string[],
  evaluations: readonly ModelEvaluation[],
): AllowListDecision {
  const reasons: Record<string, string[]> = {}
  const enter: string[] = []
  const leave: string[] = []
  const keep: string[] = []
  const byModel = new Map(evaluations.map((evaluation) => [evaluation.model, evaluation]))
  for (const evaluation of evaluations) {
    const failures = gateFailures(evaluation)
    reasons[evaluation.model] = failures
    const listed = current.includes(evaluation.model)
    if (failures.length === 0 && !listed) enter.push(evaluation.model)
    else if (failures.length > 0 && listed) leave.push(evaluation.model)
    else if (listed) keep.push(evaluation.model)
  }
  for (const model of current) if (!byModel.has(model)) keep.push(model)
  return { enter, leave, keep, reasons }
}

function courseFailures(summary: CourseSummary): string[] {
  return [
    ...(summary.artifacts < summary.expected
      ? [`course artifacts ${summary.artifacts} of ${summary.expected}`]
      : []),
    ...failuresOf(summary, COURSE_CHECKS),
  ]
}

function failuresOf<T extends object>(summary: T, checks: readonly Check<T>[]): string[] {
  return checks.flatMap((check) => {
    const value = summary[check.label]
    if (typeof value !== 'number') return []
    const failed =
      check.comparison === 'atLeast' ? value < check.threshold : value > check.threshold
    return failed
      ? [
          `${String(check.label)} ${value.toFixed(2)} ${comparisonSign(check.comparison)} ${check.threshold}`,
        ]
      : []
  })
}

function comparisonSign(comparison: Comparison): string {
  return comparison === 'atLeast' ? '<' : '>'
}
