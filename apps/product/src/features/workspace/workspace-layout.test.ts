import type { CourseGraph, DiagramSpec } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { layoutDiagram } from './diagram-layout'
import { layoutGraph } from './graph-layout'
import { reachableIds } from './reach'
import { filterGraph, filterSourceTree } from './workspace-filter'

const GRAPH: CourseGraph = {
  nodes: [
    { id: 'a', kind: 'file', label: 'Route', path: 'src/api/route.ts', layer: 'api' },
    { id: 'b', kind: 'file', label: 'Store', path: 'src/data/store.ts', layer: 'data' },
    { id: 'c', kind: 'symbol', label: 'Button', path: 'src/ui/button.tsx', layer: 'ui' },
  ],
  edges: [
    { id: 'e1', from: 'a', to: 'b', kind: 'calls' },
    { id: 'e2', from: 'c', to: 'a', kind: 'imports' },
  ],
}

const DIAGRAM: DiagramSpec = {
  id: 'd1',
  type: 'dataflow',
  title: 'Checkout',
  caption: 'How a cart moves.',
  nodes: [
    { id: 'cart', label: 'Cart', kind: 'store', refIds: [] },
    { id: 'api', label: 'Checkout API', kind: 'service', refIds: [] },
    { id: 'db', label: 'Orders', kind: 'table', refIds: [] },
  ],
  edges: [
    { id: 'e1', from: 'cart', to: 'api', label: 'submit', refIds: [] },
    { id: 'e2', from: 'api', to: 'db', refIds: [] },
  ],
}

describe('workspace graph layout', () => {
  it('groups nodes into ordered layer columns', () => {
    const layout = layoutGraph(GRAPH)
    expect(layout.layers.map((layer) => layer.name)).toEqual(['api', 'data', 'ui'])
    expect(layout.nodes.find((node) => node.node.id === 'a')?.x).toBe(16)
    expect(layout.nodes.find((node) => node.node.id === 'b')?.x).toBe(232)
  })

  it('keeps only edges between visible nodes', () => {
    expect(layoutGraph(GRAPH).edges.map((edge) => edge.edge.id)).toEqual(['e1', 'e2'])
  })

  it('walks reachable nodes in both directions', () => {
    expect([...reachableIds(GRAPH.edges, 'a', 'outgoing')]).toEqual(['b'])
    expect([...reachableIds(GRAPH.edges, 'a', 'incoming')]).toEqual(['c'])
  })
})

describe('workspace filters', () => {
  it('keeps matching nodes and the edges between them', () => {
    const filtered = filterGraph(GRAPH, 'store')
    expect(filtered.nodes.map((node) => node.id)).toEqual(['b'])
    expect(filtered.edges).toEqual([])
  })

  it('filters files by path without changing order', () => {
    const files = [
      {
        path: 'src/a.ts',
        sizeBytes: 1,
        language: 'typescript',
        role: 'source' as const,
        readable: true,
        cited: false,
      },
      {
        path: 'docs/readme.md',
        sizeBytes: 1,
        language: 'markdown',
        role: 'doc' as const,
        readable: true,
        cited: false,
      },
    ]
    expect(filterSourceTree(files, 'SRC').map((file) => file.path)).toEqual(['src/a.ts'])
  })
})

describe('diagram layout', () => {
  it('orders nodes by their dependencies and positions each edge', () => {
    const layout = layoutDiagram(DIAGRAM)
    expect(layout.nodes.map((node) => node.id)).toEqual(['cart', 'api', 'db'])
    expect(new Set(layout.nodes.map((node) => node.x)).size).toBe(3)
    expect(layout.edges.map((edge) => edge.id)).toEqual(['e1', 'e2'])
    expect(layout.edges[0]?.label).toBe('submit')
  })
})
