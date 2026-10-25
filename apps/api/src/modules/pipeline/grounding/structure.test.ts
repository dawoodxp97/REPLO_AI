import { describe, expect, it } from 'vitest'
import { fixtureIndex } from '../../../test/grounding'
import { groupOf, structuralDiagram } from './structure'

describe('groupOf', () => {
  it('groups nested source roots by their second segment', () => {
    expect(groupOf('src/api/routes.ts')).toBe('src/api')
    expect(groupOf('apps/web/app/page.tsx')).toBe('apps/web')
  })

  it('groups top-level directories and ignores root files', () => {
    expect(groupOf('docs/guide/intro.md')).toBe('docs')
    expect(groupOf('index.ts')).toBeUndefined()
  })
})

describe('structuralDiagram', () => {
  it('draws one node per source group and one edge per cross-group import', () => {
    const diagram = structuralDiagram(fixtureIndex())
    expect(diagram).toEqual({
      type: 'diagram',
      mermaid: 'flowchart LR\n  g0["src"]\n  g1["src/api"]\n  g1 --> g0',
      nodeRefs: { g0: 'src', g1: 'src/api' },
      caption: 'Source groups and the imports between them, generated from the file graph.',
    })
  })
})
