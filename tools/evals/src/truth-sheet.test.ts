import { describe, expect, it } from 'vitest'
import { TruthSheet } from './truth-sheet'

const base = {
  repo: { owner: 'synthetic', name: 'x', commitSha: 'c'.repeat(40) },
  source: { kind: 'fixture', path: 'packages/repo-analysis/fixtures/x' },
  shape: 'rest-api',
  size: 'small',
  entryPoints: ['src/main.ts'],
  coreModules: ['src/app.ts'],
  index: {
    entryPoints: [{ path: 'src/main.ts', kind: 'main' }],
    routes: [],
    imports: [],
    symbols: [],
    unresolvedImports: 0,
    parseErrors: [],
  },
}
const flow = { name: 'login', hops: ['src/a.ts'] }
const fact = { claim: 'x', evidencePath: 'src/x.ts' }

describe('TruthSheet', () => {
  it('requires exactly 10 facts and 3–5 key flows', () => {
    expect(
      TruthSheet.safeParse({ ...base, keyFlows: [flow, flow, flow], facts: Array(10).fill(fact) })
        .success,
    ).toBe(true)
    expect(
      TruthSheet.safeParse({ ...base, keyFlows: [flow], facts: Array(10).fill(fact) }).success,
    ).toBe(false)
    expect(
      TruthSheet.safeParse({ ...base, keyFlows: [flow, flow, flow], facts: Array(9).fill(fact) })
        .success,
    ).toBe(false)
  })

  it('accepts a github source and rejects an unknown shape', () => {
    const github = { ...base, source: { kind: 'github', url: 'https://github.com/a/b' } }
    expect(
      TruthSheet.safeParse({ ...github, keyFlows: [flow, flow, flow], facts: Array(10).fill(fact) })
        .success,
    ).toBe(true)
    expect(
      TruthSheet.safeParse({
        ...base,
        shape: 'blockchain',
        keyFlows: [flow, flow, flow],
        facts: Array(10).fill(fact),
      }).success,
    ).toBe(false)
  })
})
