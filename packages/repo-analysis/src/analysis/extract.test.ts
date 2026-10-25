import { describe, expect, it } from 'vitest'
import { createSourceParser, type Grammar } from './grammars'
import { extractFacts, type FileFacts } from './extract'

const parser = await createSourceParser()

const factsOf = (text: string, path: string, grammar: Grammar = 'typescript'): FileFacts => {
  const facts = parser.withTree(text, grammar, Date.now() + 5_000, (root) =>
    extractFacts(root, path),
  )
  if (!facts) throw new Error('parse failed')
  return facts
}

const describeSymbols = (facts: FileFacts) =>
  facts.symbols.map(
    (symbol) => `${symbol.qualifiedName}:${symbol.kind}:${symbol.exported ? 'export' : 'local'}`,
  )

describe('extractFacts: declarations', () => {
  it('classifies hooks, components and plain functions by name and file type', () => {
    const facts = factsOf(
      [
        'export function useCart() { return 1 }',
        'export const Header = () => <header />',
        'export function format(n: number) { return n }',
      ].join('\n'),
      'src/ui.tsx',
      'tsx',
    )
    expect(describeSymbols(facts)).toEqual([
      'useCart:hook:export',
      'Header:component:export',
      'format:function:export',
    ])
  })

  it('keeps PascalCase arrow functions as functions outside JSX files', () => {
    const facts = factsOf('export const Format = (n: number) => n\n', 'src/format.ts')
    expect(describeSymbols(facts)).toEqual(['Format:function:export'])
  })

  it('qualifies class methods with their class name and inherits export', () => {
    const facts = factsOf(
      'export abstract class Repo {\n  find() {}\n  save() {}\n}\nclass Local {\n  run() {}\n}\n',
      'src/repo.ts',
    )
    expect(describeSymbols(facts)).toEqual([
      'Repo:class:export',
      'Repo.find:method:export',
      'Repo.save:method:export',
      'Local:class:local',
      'Local.run:method:local',
    ])
  })

  it('finds interfaces, type aliases, enums and top-level variables', () => {
    const facts = factsOf(
      'export interface A {}\ntype B = string\nenum C { X }\nconst d = 4\nexport let e = 5\n',
      'src/types.ts',
    )
    expect(describeSymbols(facts)).toEqual([
      'A:interface:export',
      'B:type:local',
      'C:enum:local',
      'd:variable:local',
      'e:variable:export',
    ])
  })

  it('records exported HTTP verb functions for route handlers', () => {
    const facts = factsOf(
      'export async function GET() {}\nexport function POST() {}\nexport function helper() {}\n',
      'app/api/x/route.ts',
    )
    expect(facts.exportedFunctions).toEqual(['GET', 'POST'])
  })

  it('reports the 1-based line span and a trimmed signature', () => {
    const facts = factsOf(
      '\n\nexport function span(\n  a: number,\n) {\n  return a\n}\n',
      'src/s.ts',
    )
    expect(facts.symbols[0]).toMatchObject({
      startLine: 3,
      endLine: 7,
      signature: 'function span(',
    })
  })
})

describe('extractFacts: imports and calls', () => {
  it('collects static, re-export, dynamic and require() specifiers with lines', () => {
    const facts = factsOf(
      "import a from './a'\nexport * from './b'\nconst c = import('./c')\nconst d = require('./d')\n",
      'src/i.js',
      'javascript',
    )
    expect(facts.imports).toEqual([
      { specifier: './a', line: 1 },
      { specifier: './b', line: 2 },
      { specifier: './c', line: 3 },
      { specifier: './d', line: 4 },
    ])
  })

  it('captures member calls with receiver, method and the first string argument', () => {
    const facts = factsOf(
      "const app = express()\napp.get('/health', h)\napp.listen(3000)\n",
      'src/server.ts',
    )
    expect(facts.constructors).toEqual([{ name: 'app', callee: 'express' }])
    expect(facts.calls).toEqual(
      expect.arrayContaining([
        { callee: 'app.get', receiver: 'app', method: 'get', firstString: '/health', line: 2 },
        { callee: 'app.listen', receiver: 'app', method: 'listen', firstString: null, line: 3 },
      ]),
    )
  })

  it('records path properties used by client-side route objects', () => {
    const facts = factsOf("const r = [{ path: '/tasks/:id', element: null }]\n", 'src/r.tsx', 'tsx')
    expect(facts.pathProperties).toEqual([{ value: '/tasks/:id', line: 1 }])
  })

  it('flags a file with a syntax error but still extracts what parsed', () => {
    const facts = factsOf('export function ok() {}\nexport const = 3\n', 'src/bad.ts')
    expect(facts.hasErrors).toBe(true)
    expect(describeSymbols(facts)).toContain('ok:function:export')
  })
})
