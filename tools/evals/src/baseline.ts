import type { IndexMetrics } from './index-score'

export interface Regression {
  repo: string
  metric: keyof IndexMetrics
  baseline: number
  current: number
}

export function findRegressions(
  current: Record<string, IndexMetrics>,
  baseline: Record<string, IndexMetrics>,
): Regression[] {
  const regressions: Regression[] = []
  for (const [repo, expected] of Object.entries(baseline)) {
    const actual = current[repo]
    if (!actual) {
      regressions.push({ repo, metric: 'entryRecall', baseline: 1, current: 0 })
      continue
    }
    for (const metric of Object.keys(expected) as (keyof IndexMetrics)[]) {
      if (actual[metric] < expected[metric])
        regressions.push({ repo, metric, baseline: expected[metric], current: actual[metric] })
    }
  }
  return regressions
}
