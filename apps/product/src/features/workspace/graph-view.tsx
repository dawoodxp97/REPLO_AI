'use client'

import type { CourseGraph } from '@replo/contracts'
import { cn } from '@replo/ui'
import { layoutGraph, type GraphLayerName } from './graph-layout'

const LAYER_LABELS: Record<GraphLayerName, string> = {
  api: 'API',
  service: 'Service',
  data: 'Data',
  ui: 'UI',
  util: 'Utility',
  other: 'Other',
}

export function GraphView({
  graph,
  selectedNodeId,
  onSelectNode,
}: {
  graph: CourseGraph
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
}) {
  const layout = layoutGraph(graph)

  if (layout.nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No nodes match this filter.</p>
  }

  return (
    <div className="min-w-0 space-y-6">
      <h2 className="sr-only">Graph</h2>
      <figure className="min-w-0 space-y-2">
        <div
          className="w-full max-w-full overflow-x-auto rounded-lg border bg-card p-3 shadow-xs"
          role="region"
          aria-label="Graph map"
          tabIndex={0}
        >
          <svg width={layout.width} height={layout.height} aria-hidden className="max-w-none">
            <defs>
              <marker
                id="graph-arrow"
                viewBox="0 0 8 8"
                refX={7}
                refY={4}
                markerWidth={6}
                markerHeight={6}
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--muted-foreground)" />
              </marker>
            </defs>
            {layout.layers.map((layer) => (
              <text
                key={layer.name}
                x={layer.x}
                y={12}
                fontSize={11}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {LAYER_LABELS[layer.name]} · {layer.count}
              </text>
            ))}
            {layout.edges.map(({ edge, path }) => {
              const related =
                selectedNodeId === null ||
                edge.from === selectedNodeId ||
                edge.to === selectedNodeId
              return (
                <path
                  key={edge.id}
                  d={path}
                  fill="none"
                  stroke={related ? 'var(--muted-foreground)' : 'var(--border)'}
                  strokeWidth={related ? 1.4 : 1}
                  markerEnd="url(#graph-arrow)"
                />
              )
            })}
            {layout.nodes.map(({ node, x, y, width, height }) => {
              const selected = node.id === selectedNodeId
              return (
                <g key={node.id} onClick={() => onSelectNode(node.id)} className="cursor-pointer">
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    fill={selected ? 'var(--accent)' : 'var(--muted)'}
                    stroke={selected ? 'var(--ring)' : 'var(--border)'}
                    strokeWidth={selected ? 1.5 : 1}
                  />
                  <text
                    x={x + 10}
                    y={y + 18}
                    fontSize={12}
                    fill="currentColor"
                    className="text-foreground"
                  >
                    {shorten(node.label)}
                  </text>
                  <text
                    x={x + 10}
                    y={y + 34}
                    fontSize={10}
                    fill="currentColor"
                    className="font-mono text-muted-foreground"
                  >
                    {node.path ?? node.kind}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
        <figcaption className="text-xs text-muted-foreground">
          Files and symbols grouped by layer. Choose a node in the list to read its summary, source
          and edges.
          {layout.hiddenNodes > 0
            ? ` ${layout.hiddenNodes} less-connected nodes are hidden; use the search to reach them.`
            : ''}
        </figcaption>
      </figure>

      <section aria-label="Nodes by layer" className="grid gap-6 md:grid-cols-3">
        {layout.layers.map((layer) => (
          <div key={layer.name} className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">
              {LAYER_LABELS[layer.name]}{' '}
              <span className="tabular font-mono text-xs text-muted-foreground">{layer.count}</span>
            </h3>
            <ul className="space-y-1">
              {layout.nodes
                .filter((positioned) => positioned.layer === layer.name)
                .map(({ node }) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      aria-pressed={node.id === selectedNodeId}
                      onClick={() => onSelectNode(node.id)}
                      className={cn(
                        'flex w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:-outline-offset-2 pointer-coarse:min-h-10 pointer-coarse:py-2.5',
                        node.id === selectedNodeId && 'bg-accent',
                      )}
                    >
                      <span className="min-w-0 truncate">{node.label}</span>
                      <span className="max-w-32 shrink-0 truncate font-mono text-xs text-muted-foreground">
                        {node.path ?? node.kind}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}

function shorten(label: string): string {
  return label.length > 26 ? `${label.slice(0, 25)}…` : label
}
