import { describe, expect, it } from 'vitest'
import { scoreDiagrams } from './course-diagrams'
import { snapshotLookup } from './snapshot'
import { testContent, testSnapshot } from './test-course'

describe('scoreDiagrams', () => {
  it('resolves every diagram node, edge and evidence chip', () => {
    expect(scoreDiagrams(testContent(), snapshotLookup(testSnapshot))).toEqual({
      diagramValidity: 1,
      issues: [],
    })
  })

  it('rejects an edge whose endpoint is not a diagram node', () => {
    const content = testContent()
    content.diagrams[0]!.edges.push({
      id: 'broken',
      from: 'file:src/a.ts',
      to: 'file:missing.ts',
      refIds: [],
    })
    const score = scoreDiagrams(content, snapshotLookup(testSnapshot))
    expect(score.diagramValidity).toBeLessThan(1)
    expect(score.issues[0]).toContain('missing endpoint')
  })

  it('rejects a diagram node that is not in the course graph', () => {
    const content = testContent()
    content.diagrams[0]!.nodes.push({
      id: 'file:src/c.ts',
      label: 'src/c.ts',
      kind: 'file',
      refIds: [],
    })
    const score = scoreDiagrams(content, snapshotLookup(testSnapshot))
    expect(score.diagramValidity).toBeLessThan(1)
    expect(score.issues.some((issue) => issue.includes('not in the graph'))).toBe(true)
  })

  it('rejects an unresolved ref chip', () => {
    const content = testContent()
    content.diagrams[0]!.nodes[0]!.refIds.push('r_missing')
    expect(scoreDiagrams(content, snapshotLookup(testSnapshot)).diagramValidity).toBeLessThan(1)
  })
})
