import { describe, expect, it } from 'vitest'
import { createAnalyzer } from './analyzer'

const analyzer = await createAnalyzer()

function analyze() {
  const session = analyzer.start({})
  const add = (path: string, text: string) =>
    session.addFile({ path, text, role: 'source', language: 'typescript' })
  add('src/base.ts', 'export class Base {}\n')
  add('src/helper.ts', 'export function helper() { return 1 }\n')
  add(
    'src/store.ts',
    ["import { Base } from './base'", 'export class Store extends Base {}'].join('\n'),
  )
  add(
    'src/index.ts',
    [
      "import { Store } from './store'",
      "import { helper } from './helper'",
      'export function make() { return new Store() }',
      'export function run() { return helper() }',
    ].join('\n'),
  )
  return session.finish()
}

describe('reference edges', () => {
  it('records extends and cross-file calls beside imports', () => {
    const result = analyze()
    expect(result.edges).toEqual(
      expect.arrayContaining([
        { fromPath: 'src/store.ts', toPath: 'src/base.ts', kind: 'extends' },
        { fromPath: 'src/index.ts', toPath: 'src/helper.ts', kind: 'call' },
      ]),
    )
  })

  it('does not record calls to methods, keywords or local symbols', () => {
    const result = analyze()
    const calls = result.edges.filter((edge) => edge.kind === 'call')
    expect(calls).toEqual([
      { fromPath: 'src/index.ts', toPath: 'src/helper.ts', kind: 'call' },
    ])
  })
})
