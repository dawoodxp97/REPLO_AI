export const GATE = {
  schemaValidRate: 0.9,
  referenceValidityPre: 0.95,
  entryRecall: 0.6,
  fabricatedPerCall: 0.2,
} as const

export interface ModelSummary {
  model: string
  calls: number
  schemaValidRate: number
  referenceValidityPre: number
  entryRecall: number
  fabricatedPerCall: number
  costUsd: number
  latencyMs: number
}

const CHECKS = [
  { metric: 'schemaValidRate', threshold: GATE.schemaValidRate, comparison: '<' },
  { metric: 'referenceValidityPre', threshold: GATE.referenceValidityPre, comparison: '<' },
  { metric: 'entryRecall', threshold: GATE.entryRecall, comparison: '<' },
  { metric: 'fabricatedPerCall', threshold: GATE.fabricatedPerCall, comparison: '>' },
] as const

export function gateFailures(summary: ModelSummary): string[] {
  return CHECKS.flatMap(({ metric, threshold, comparison }) => {
    const value = summary[metric]
    const failed = comparison === '<' ? value < threshold : value > threshold
    return failed ? [`${metric} ${value.toFixed(2)} ${comparison} ${threshold}`] : []
  })
}

export interface AllowListDecision {
  enter: string[]
  leave: string[]
  keep: string[]
  reasons: Record<string, string[]>
}

export function decideAllowList(
  current: readonly string[],
  summaries: readonly ModelSummary[],
): AllowListDecision {
  const reasons: Record<string, string[]> = {}
  const enter: string[] = []
  const leave: string[] = []
  const keep: string[] = []
  const byModel = new Map(summaries.map((summary) => [summary.model, summary]))
  for (const summary of summaries) {
    const failures = gateFailures(summary)
    reasons[summary.model] = failures
    const listed = current.includes(summary.model)
    if (failures.length === 0 && !listed) enter.push(summary.model)
    else if (failures.length > 0 && listed) leave.push(summary.model)
    else if (listed) keep.push(summary.model)
  }
  for (const model of current) if (!byModel.has(model)) keep.push(model)
  return { enter, leave, keep, reasons }
}
