import { describe, expect, it } from 'vitest'
import { fixtureIndex } from '../../../test/grounding'
import { checkDiagram, parseDiagram, renderFlowchart } from './mermaid'
import type { SourceIndex } from './source-index'

const index = (): SourceIndex => fixtureIndex()

describe('parseDiagram', () => {
  it('parses nodes, labels and labelled edges', () => {
    expect(parseDiagram('flowchart LR\n  A[Route] --> B\n  B -->|calls| C(Cart)')).toEqual({
      direction: 'LR',
      nodes: [{ id: 'A', label: 'Route' }, { id: 'B' }, { id: 'C', label: 'Cart' }],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C', label: 'calls' },
      ],
    })
  })

  it('refuses anything outside the restricted grammar', () => {
    expect(
      parseDiagram('flowchart TD\n  A --> B\n  click A "https://evil.example"'),
    ).toBeUndefined()
    expect(parseDiagram('flowchart TD\n  subgraph S\n  end')).toBeUndefined()
    expect(parseDiagram('sequenceDiagram\n  A->>B: hi')).toBeUndefined()
    expect(parseDiagram('flowchart TD\n  A["<b>x</b>"] --> B')).toBeUndefined()
  })
})

describe('checkDiagram', () => {
  it('keeps edges that follow real imports and drops the rest', async () => {
    const idx = index()
    await idx.load([])
    const verdict = checkDiagram(
      'flowchart LR\n  A[Route] --> B[Cart]\n  B --> A',
      { A: 'src/api/routes.ts', B: 'src/cart.ts' },
      idx,
    )
    expect(verdict).toEqual({
      ok: true,
      diagram: {
        mermaid: 'flowchart LR\n  A["Route"]\n  B["Cart"]\n  A --> B',
        nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' },
        unverifiedHops: 1,
      },
    })
  })

  it('refuses a node with no repository path', () => {
    expect(checkDiagram('flowchart LR\n  A --> B', { A: 'src/cart.ts' }, index())).toEqual({
      ok: false,
      reason: 'UNMAPPED_NODE',
    })
  })

  it('refuses a node that maps to a path not in the repository', () => {
    expect(
      checkDiagram('flowchart LR\n  A --> B', { A: 'src/cart.ts', B: 'src/ghost.ts' }, index()),
    ).toEqual({ ok: false, reason: 'UNMAPPED_NODE' })
  })

  it('refuses a diagram whose every hop is unverified', () => {
    expect(
      checkDiagram(
        'flowchart LR\n  A --> B',
        { A: 'src/cart.ts', B: 'src/api/routes.ts' },
        index(),
      ),
    ).toEqual({ ok: false, reason: 'NO_VERIFIED_HOPS' })
  })

  it('resolves node paths written with a ./ prefix', () => {
    const verdict = checkDiagram(
      'flowchart LR\n  A[Route] --> B[Cart]',
      { A: './src/api/routes.ts', B: './src/cart.ts' },
      index(),
    )
    expect(verdict).toMatchObject({
      ok: true,
      diagram: { nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' }, unverifiedHops: 0 },
    })
  })

  it('refuses hops between two nodes that map to the same file', () => {
    expect(
      checkDiagram(
        'flowchart LR\n  A[Cart] --> B[Cart]',
        { A: 'src/cart.ts', B: 'src/cart.ts' },
        index(),
      ),
    ).toEqual({ ok: false, reason: 'NO_VERIFIED_HOPS' })
  })

  it('refuses syntax errors', () => {
    expect(
      checkDiagram('graph ZZ\n  A --> B', { A: 'src/cart.ts', B: 'src/cart.ts' }, index()),
    ).toEqual({
      ok: false,
      reason: 'INVALID_SYNTAX',
    })
  })
})

describe('renderFlowchart', () => {
  it('renders canonical text that parses back to the same graph', () => {
    const text = renderFlowchart({
      direction: 'TD',
      nodes: [{ id: 'A', label: 'Route' }, { id: 'B' }],
      edges: [{ from: 'A', to: 'B', label: 'calls' }],
    })
    expect(parseDiagram(text)).toEqual({
      direction: 'TD',
      nodes: [{ id: 'A', label: 'Route' }, { id: 'B' }],
      edges: [{ from: 'A', to: 'B', label: 'calls' }],
    })
  })
})
