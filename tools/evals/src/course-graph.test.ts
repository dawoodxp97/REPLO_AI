import { describe, expect, it } from 'vitest'
import { scoreGraph } from './course-graph'
import { snapshotLookup } from './snapshot'
import { testGraph, testSnapshot, testTruth } from './test-course'

describe('scoreGraph', () => {
  it('scores a complete graph at one on coverage and integrity', () => {
    expect(scoreGraph(testTruth, testSnapshot, snapshotLookup(testSnapshot), testGraph)).toEqual({
      graphCoverage: 1,
      graphIntegrity: 1,
    })
  })

  it('lowers coverage when a truth module is missing', () => {
    const graph = structuredClone(testGraph)
    graph.nodes = graph.nodes.filter((node) => node.id !== 'file:src/b.ts')
    graph.edges = graph.edges.filter(
      (edge) => edge.from !== 'file:src/b.ts' && edge.to !== 'file:src/b.ts',
    )
    const score = scoreGraph(testTruth, testSnapshot, snapshotLookup(testSnapshot), graph)
    expect(score.graphCoverage).toBeLessThan(1)
    expect(score.graphIntegrity).toBe(1)
  })

  it('lowers integrity for a dangling edge or an unknown file node', () => {
    const dangling = structuredClone(testGraph)
    dangling.edges.push({
      id: 'bad',
      from: 'file:src/a.ts',
      to: 'file:missing.ts',
      kind: 'imports',
    })
    const missing = structuredClone(testGraph)
    missing.nodes.push({
      id: 'file:missing.ts',
      kind: 'file',
      label: 'missing',
      path: 'missing.ts',
    })
    expect(
      scoreGraph(testTruth, testSnapshot, snapshotLookup(testSnapshot), dangling).graphIntegrity,
    ).toBeLessThan(1)
    expect(
      scoreGraph(testTruth, testSnapshot, snapshotLookup(testSnapshot), missing).graphIntegrity,
    ).toBeLessThan(1)
  })
})
