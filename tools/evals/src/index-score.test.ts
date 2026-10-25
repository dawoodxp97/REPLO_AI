import { describe, expect, it } from 'vitest'
import type { Analysis } from '@replo/repo-analysis'
import { average, scoreIndex } from './index-score'
import type { IndexExpectations } from './truth-sheet'

const expected: IndexExpectations = {
  entryPoints: [{ path: 'src/a.ts', kind: 'main' }],
  routes: [{ method: 'GET', pattern: '/x', path: 'src/a.ts' }],
  imports: [['src/a.ts', 'src/b.ts']],
  symbols: ['src/a.ts#run'],
  unresolvedImports: 0,
  parseErrors: [],
}

const actual = (overrides: Partial<Analysis> = {}): Analysis => ({
  framework: null,
  symbols: [],
  edges: [],
  entryPoints: [],
  routes: [],
  metrics: {},
  unresolvedImports: 0,
  parseErrors: [],
  ...overrides,
})

describe('scoreIndex', () => {
  it('scores a perfect index at 1 on every metric', () => {
    const score = scoreIndex(
      expected,
      actual({
        entryPoints: [{ path: 'src/a.ts', kind: 'main', score: 80, reason: 'main' }],
        routes: [{ framework: 'express', method: 'GET', pattern: '/x', path: 'src/a.ts', line: 1 }],
        edges: [{ fromPath: 'src/a.ts', toPath: 'src/b.ts', kind: 'import' }],
        symbols: [
          {
            symbolKey: 'src/a.ts#run',
            qualifiedName: 'run',
            name: 'run',
            kind: 'function',
            startLine: 1,
            endLine: 1,
            exported: true,
            signature: '',
            path: 'src/a.ts',
          },
        ],
      }),
    )
    expect(Object.values(score).every((value) => value === 1)).toBe(true)
  })

  it('separates recall from precision when the index adds noise', () => {
    const score = scoreIndex(
      expected,
      actual({
        entryPoints: [
          { path: 'src/a.ts', kind: 'main', score: 80, reason: 'main' },
          { path: 'src/extra.ts', kind: 'main', score: 80, reason: 'main' },
        ],
      }),
    )
    expect(score.entryRecall).toBe(1)
    expect(score.entryPrecision).toBe(0.5)
  })

  it('reports zero precision when the index finds nothing it was asked to find', () => {
    const score = scoreIndex(expected, actual())
    expect(score.entryRecall).toBe(0)
    expect(score.entryPrecision).toBe(0)
  })

  it('ignores test_of edges when counting import recall', () => {
    const score = scoreIndex(
      expected,
      actual({ edges: [{ fromPath: 'src/a.ts', toPath: 'src/b.ts', kind: 'test_of' }] }),
    )
    expect(score.importRecall).toBe(0)
  })

  it('flags an unresolved-import count that differs from the truth', () => {
    expect(scoreIndex(expected, actual({ unresolvedImports: 3 })).unresolvedMatches).toBe(0)
  })
})

describe('average', () => {
  it('averages each metric across repos', () => {
    const a = scoreIndex(expected, actual())
    const b = { ...a, entryRecall: 1 }
    expect(average([a, b]).entryRecall).toBe(0.5)
  })
})
