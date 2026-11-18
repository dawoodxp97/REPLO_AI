import { describe, expect, it } from 'vitest'
import type { SnapshotView } from '../indexing/indexing.service'
import { buildCourseGraph, repairGraph, structuralGraph } from './graph'

const SHA = 'a'.repeat(40)

function view(): SnapshotView {
  return {
    repositoryId: 'repo',
    owner: 'acme',
    name: 'shop',
    commitSha: SHA,
    analysis: {
      analyzerVersion: 1,
      framework: null,
      entryPoints: [],
      routes: [],
      metrics: { 'src/cart.ts': { pageRank: 0.6, fanIn: 1, fanOut: 0 } },
      unresolvedImports: 0,
      parseErrors: [],
    },
    files: [
      { path: 'src/cart.ts', blobSha: 'b1', language: 'typescript', role: 'source', sizeBytes: 10 },
      { path: 'src/api/routes.ts', blobSha: 'b2', language: 'typescript', role: 'source', sizeBytes: 10 },
    ],
    symbols: [
      {
        symbolKey: 'src/cart.ts#Cart',
        name: 'Cart',
        kind: 'class',
        path: 'src/cart.ts',
        startLine: 1,
        endLine: 3,
        exported: true,
        signature: null,
      },
    ],
    edges: [{ fromPath: 'src/api/routes.ts', toPath: 'src/cart.ts', kind: 'import' }],
    dependencies: [],
  }
}

describe('buildCourseGraph', () => {
  it('creates file and module nodes with the import edge between files', () => {
    const graph = structuralGraph(view())
    const ids = new Set(graph.nodes.map((node) => node.id))
    expect(ids.has('file:src/cart.ts')).toBe(true)
    expect(ids.has('file:src/api/routes.ts')).toBe(true)
    expect(ids.has('group:src')).toBe(true)
    expect(ids.has('group:src/api')).toBe(true)
    expect(graph.edges).toContainEqual({
      id: 'imports|file:src/api/routes.ts|file:src/cart.ts',
      from: 'file:src/api/routes.ts',
      to: 'file:src/cart.ts',
      kind: 'imports',
    })
    // Classes/interfaces become symbol nodes; plain functions do not.
    expect(ids.has('sym:src/cart.ts#Cart')).toBe(true)
  })

  it('folds enrichment into file nodes and adds domain nodes with containment edges', () => {
    const graph = buildCourseGraph(view(), {
      'src/cart.ts': { summary: 'Cart state', layer: 'data', domain: 'cart' },
      'src/api/routes.ts': { summary: 'HTTP routes', layer: 'api', domain: 'cart' },
    })
    const cart = graph.nodes.find((node) => node.id === 'file:src/cart.ts')
    expect(cart).toMatchObject({ layer: 'data', domain: 'cart', summary: 'Cart state' })
    expect(graph.nodes.some((node) => node.id === 'domain:cart')).toBe(true)
    expect(graph.edges.some((edge) => edge.kind === 'contains' && edge.from === 'domain:cart')).toBe(
      true,
    )
  })
})

describe('repairGraph', () => {
  it('drops edges whose endpoints are not declared nodes and de-duplicates ids', () => {
    const repaired = repairGraph({
      nodes: [
        { id: 'a', kind: 'file', label: 'a' },
        { id: 'a', kind: 'file', label: 'a' },
        { id: 'b', kind: 'file', label: 'b' },
      ],
      edges: [
        { id: 'e1', from: 'a', to: 'b', kind: 'imports' },
        { id: 'e2', from: 'a', to: 'ghost', kind: 'imports' },
      ],
    })
    expect(repaired.nodes.map((node) => node.id)).toEqual(['a', 'b'])
    expect(repaired.edges.map((edge) => edge.id)).toEqual(['e1'])
  })
})