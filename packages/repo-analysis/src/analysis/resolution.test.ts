import { describe, expect, it } from 'vitest'
import { grammarFor } from './grammars'
import { pageRank } from './graph'
import { parseCompilerPaths, stripJsonc } from './tsconfig'
import { candidatesFor, resolveSpecifier } from './resolve'

const files = new Set([
  'src/index.ts',
  'src/util.tsx',
  'src/math/index.ts',
  'src/math/add.ts',
  'src/shared/format.ts',
  'src/shared/format/nested.ts',
  'legacy/old.js',
  'vendor/left.ts',
])

describe('stripJsonc', () => {
  it('removes line and block comments and trailing commas', () => {
    const text = '{ /* block */ "a": 1, // note\n "b": [1, 2,], }'
    expect(JSON.parse(stripJsonc(text))).toEqual({ a: 1, b: [1, 2] })
  })

  it('removes a trailing comma that sits before a comment and the closing bracket', () => {
    expect(JSON.parse(stripJsonc('{ "a": [1, /* x */ // y\n 2, // z\n], }'))).toEqual({ a: [1, 2] })
  })

  it('leaves comment markers inside strings alone', () => {
    expect(JSON.parse(stripJsonc('{"url": "https://x.test/a//b", "c": "/* not */"}'))).toEqual({
      url: 'https://x.test/a//b',
      c: '/* not */',
    })
  })
})

describe('parseCompilerPaths', () => {
  it('reads baseUrl relative to the config directory and the path aliases', () => {
    const parsed = parseCompilerPaths(
      '{ "compilerOptions": { "baseUrl": "src", "paths": { "@app/*": ["app/*"] } } }',
      'web',
    )
    expect(parsed).toEqual({ baseUrl: 'web/src', paths: { '@app/*': ['app/*'] } })
  })

  it('yields no aliases for a missing or unreadable config', () => {
    expect(parseCompilerPaths(undefined, '')).toEqual({ baseUrl: undefined, paths: {} })
    expect(parseCompilerPaths('{ not json', '')).toEqual({ baseUrl: undefined, paths: {} })
  })
})

describe('candidatesFor', () => {
  it('tries the exact path, then extensions, then index files', () => {
    expect(candidatesFor('src/index.ts', files)).toBe('src/index.ts')
    expect(candidatesFor('src/util', files)).toBe('src/util.tsx')
    expect(candidatesFor('src/math', files)).toBe('src/math/index.ts')
  })

  it('maps ESM .js specifiers to their TypeScript sources', () => {
    expect(candidatesFor('src/util.js', files)).toBe('src/util.tsx')
  })

  it('returns undefined when nothing matches', () => {
    expect(candidatesFor('src/missing', files)).toBeUndefined()
  })
})

describe('resolveSpecifier', () => {
  const plain = { files, workspace: new Map(), compilerPaths: { baseUrl: undefined, paths: {} } }

  it('resolves relative specifiers from the importing file', () => {
    expect(resolveSpecifier('src/math/add.ts', '../util', plain)).toEqual({
      kind: 'internal',
      path: 'src/util.tsx',
    })
  })

  it('reports a relative specifier that resolves to nothing as unresolved', () => {
    expect(resolveSpecifier('src/index.ts', './nope', plain)).toEqual({ kind: 'unresolved' })
  })

  it('prefers the most specific tsconfig path pattern', () => {
    const context = {
      files,
      workspace: new Map(),
      compilerPaths: {
        baseUrl: undefined,
        paths: { '@/*': ['src/*'], '@/shared/*': ['src/shared/*'] },
      },
    }
    expect(resolveSpecifier('src/index.ts', '@/shared/format', context)).toEqual({
      kind: 'internal',
      path: 'src/shared/format.ts',
    })
  })

  it('falls back to baseUrl for bare specifiers that name a project file', () => {
    const context = { files, workspace: new Map(), compilerPaths: { baseUrl: 'src', paths: {} } }
    expect(resolveSpecifier('src/index.ts', 'math', context)).toEqual({
      kind: 'internal',
      path: 'src/math/index.ts',
    })
  })

  it('treats a bare package name with no project match as external', () => {
    expect(resolveSpecifier('src/index.ts', 'lodash/fp', plain)).toEqual({ kind: 'external' })
  })
})

describe('pageRank', () => {
  it('ranks a node that many others point to above its importers', () => {
    const ranks = pageRank(
      ['a', 'b', 'c'],
      [
        { from: 'a', to: 'c' },
        { from: 'b', to: 'c' },
      ],
    )
    expect(ranks.get('c') ?? 0).toBeGreaterThan(ranks.get('a') ?? 1)
  })

  it('sums to one even with dangling nodes', () => {
    const ranks = pageRank(['a', 'b', 'c'], [{ from: 'a', to: 'b' }])
    const total = [...ranks.values()].reduce((sum, value) => sum + value, 0)
    expect(total).toBeCloseTo(1, 6)
  })

  it('returns an empty map for an empty graph', () => {
    expect(pageRank([], []).size).toBe(0)
  })
})

describe('grammarFor', () => {
  it('chooses the grammar from the extension, including JSX-capable JavaScript', () => {
    expect(grammarFor('a/b.ts')).toBe('typescript')
    expect(grammarFor('a/b.tsx')).toBe('tsx')
    expect(grammarFor('a/b.jsx')).toBe('javascript')
    expect(grammarFor('a/b.css')).toBeUndefined()
    expect(grammarFor('Makefile')).toBeUndefined()
  })
})
