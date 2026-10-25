import { describe, expect, it } from 'vitest'
import { describeFlowchart } from './mermaid-steps'

describe('describeFlowchart', () => {
  it('turns labelled edges into ordered steps using node labels', () => {
    const definition = [
      'flowchart LR',
      '  A[Cart button] -->|dispatches| B[Cart thunk]',
      '  B --> C("Store")',
    ].join('\n')

    expect(describeFlowchart(definition)).toEqual([
      { from: 'Cart button', to: 'Cart thunk', label: 'dispatches' },
      { from: 'Cart thunk', to: 'Store', label: null },
    ])
  })

  it('falls back to the node id when a node has no label', () => {
    expect(describeFlowchart('flowchart TD\n  api --> db')).toEqual([
      { from: 'api', to: 'db', label: null },
    ])
  })

  it('returns no steps for a diagram without edges', () => {
    expect(describeFlowchart('flowchart TD\n  A[Only node]')).toEqual([])
  })
})
