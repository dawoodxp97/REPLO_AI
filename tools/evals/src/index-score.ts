import { z } from 'zod'
import type { Analysis } from '@replo/repo-analysis'
import { routeKey, type IndexExpectations } from './truth-sheet'

export const IndexMetricsSchema = z.object({
  entryRecall: z.number(),
  entryPrecision: z.number(),
  routeRecall: z.number(),
  routePrecision: z.number(),
  importRecall: z.number(),
  importPrecision: z.number(),
  symbolRecall: z.number(),
  unresolvedMatches: z.number(),
  parseErrorsMatch: z.number(),
})
export type IndexMetrics = z.infer<typeof IndexMetricsSchema>

const METRIC_KEYS = IndexMetricsSchema.keyof().options

const ratio = (hits: number, total: number) => (total === 0 ? 1 : hits / total)

function score<T>(expected: readonly T[], actual: readonly T[], key: (value: T) => string) {
  const want = new Set(expected.map(key))
  const got = new Set(actual.map(key))
  const hits = [...got].filter((item) => want.has(item)).length
  return {
    recall: ratio(hits, want.size),
    precision: got.size === 0 ? (want.size === 0 ? 1 : 0) : hits / got.size,
  }
}

const sameSet = (left: readonly string[], right: readonly string[]) => {
  const a = [...new Set(left)].sort().join('\n')
  const b = [...new Set(right)].sort().join('\n')
  return a === b
}

export function scoreIndex(expected: IndexExpectations, actual: Analysis): IndexMetrics {
  const entries = score(expected.entryPoints, actual.entryPoints, (e) => `${e.path}|${e.kind}`)
  const routes = score(expected.routes, actual.routes, routeKey)
  const imports = score(
    expected.imports.map(([from, to]) => ({ from, to })),
    actual.edges
      .filter((edge) => edge.kind === 'import')
      .map((edge) => ({ from: edge.fromPath, to: edge.toPath })),
    (edge) => `${edge.from}>${edge.to}`,
  )
  const symbols = score(
    expected.symbols,
    actual.symbols.map((symbol) => symbol.symbolKey),
    (key) => key,
  )

  return {
    entryRecall: entries.recall,
    entryPrecision: entries.precision,
    routeRecall: routes.recall,
    routePrecision: routes.precision,
    importRecall: imports.recall,
    importPrecision: imports.precision,
    symbolRecall: symbols.recall,
    unresolvedMatches: actual.unresolvedImports === expected.unresolvedImports ? 1 : 0,
    parseErrorsMatch: sameSet(expected.parseErrors, actual.parseErrors) ? 1 : 0,
  }
}

export function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

export function average(metrics: readonly IndexMetrics[]): IndexMetrics {
  return IndexMetricsSchema.parse(
    Object.fromEntries(METRIC_KEYS.map((key) => [key, mean(metrics.map((metric) => metric[key]))])),
  )
}
