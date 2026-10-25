import { describe, expect, it } from 'vitest'
import { findRegressions } from './baseline'
import type { IndexMetrics } from './index-score'

const full: IndexMetrics = {
  entryRecall: 1,
  entryPrecision: 1,
  routeRecall: 1,
  routePrecision: 1,
  importRecall: 1,
  importPrecision: 1,
  symbolRecall: 1,
  unresolvedMatches: 1,
  parseErrorsMatch: 1,
}

describe('findRegressions', () => {
  it('reports nothing when the index matches or improves on the baseline', () => {
    expect(findRegressions({ a: full }, { a: full })).toEqual([])
    expect(findRegressions({ a: full }, { a: { ...full, entryRecall: 0.5 } })).toEqual([])
  })

  it('reports a metric that dropped below the baseline', () => {
    expect(findRegressions({ a: { ...full, importRecall: 0.9 } }, { a: full })).toEqual([
      { repo: 'a', metric: 'importRecall', baseline: 1, current: 0.9 },
    ])
  })

  it('reports a baselined repo that is missing from the run', () => {
    expect(findRegressions({}, { a: full })[0]).toMatchObject({ repo: 'a' })
  })
})
