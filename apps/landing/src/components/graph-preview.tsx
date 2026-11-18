import { CodePanel, CodePanelHeader, MonoLabel } from '@replo/ui'

const NODE_HEIGHT = 18
const NODE_TOP = 54
const ROW_GAP = 32
const WIDTH = 744
const HEIGHT = 168

const LAYERS = [
  {
    name: 'UI',
    x: 28,
    nodes: [
      { id: 'page', row: 0, width: 92 },
      { id: 'component', row: 1, width: 100 },
      { id: 'hook', row: 2, width: 64 },
    ],
  },
  {
    name: 'API',
    x: 172,
    nodes: [
      { id: 'route', row: 0, width: 78 },
      { id: 'handler', row: 1, width: 94 },
      { id: 'middleware', row: 2, width: 106 },
    ],
  },
  {
    name: 'Service',
    x: 316,
    nodes: [
      { id: 'use-case', row: 0, width: 86 },
      { id: 'service', row: 1, width: 100 },
      { id: 'policy', row: 2, width: 72 },
    ],
  },
  {
    name: 'Data',
    x: 460,
    nodes: [
      { id: 'schema', row: 0, width: 76 },
      { id: 'query', row: 1, width: 88 },
      { id: 'client', row: 2, width: 82 },
    ],
  },
  {
    name: 'Utility',
    x: 604,
    nodes: [
      { id: 'types', row: 0, width: 74 },
      { id: 'config', row: 1, width: 80 },
      { id: 'helper', row: 2, width: 72 },
    ],
  },
] as const

const EDGES = [
  ['page', 'route'],
  ['component', 'handler'],
  ['hook', 'use-case'],
  ['route', 'use-case'],
  ['handler', 'service'],
  ['middleware', 'policy'],
  ['use-case', 'query'],
  ['service', 'client'],
  ['policy', 'schema'],
  ['use-case', 'helper'],
  ['client', 'config'],
  ['query', 'types'],
] as const satisfies readonly (readonly [NodeId, NodeId])[]

type NodeId = (typeof LAYERS)[number]['nodes'][number]['id']

const NODES = LAYERS.flatMap((layer) => layer.nodes.map((node) => ({ ...node, x: layer.x })))

const NODES_BY_ID = new Map(NODES.map((node) => [node.id, node]))

const SELECTED_NODE = 'service'

function edgePath([fromId, toId]: readonly [NodeId, NodeId]): string | null {
  const from = NODES_BY_ID.get(fromId)
  const to = NODES_BY_ID.get(toId)
  if (!from || !to) return null
  const startX = from.x + from.width
  const startY = NODE_TOP + from.row * ROW_GAP + NODE_HEIGHT / 2
  const endX = to.x
  const endY = NODE_TOP + to.row * ROW_GAP + NODE_HEIGHT / 2
  const bend = (startX + endX) / 2
  return `M ${startX} ${startY} C ${bend} ${startY}, ${bend} ${endY}, ${endX} ${endY}`
}

export function GraphPreview() {
  return (
    <figure className="min-w-0 max-w-4xl">
      <figcaption className="mb-3 text-xs text-muted-foreground">
        Schematic, not a repository. Each mark is a file or symbol; columns are layers. Edges come
        from imports, calls, extends and implements.
      </figcaption>
      <CodePanel className="overflow-hidden font-sans">
        <CodePanelHeader>
          <MonoLabel className="text-xs text-foreground">graph · layer grouping</MonoLabel>
          <MonoLabel>schematic</MonoLabel>
        </CodePanelHeader>
        <div
          role="region"
          aria-label="Schematic of a layer-grouped graph"
          tabIndex={0}
          className="scrollbar-thin overflow-x-auto p-3"
        >
          <svg
            aria-hidden="true"
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full min-w-[640px]"
          >
            <defs>
              <marker
                id="graph-preview-arrow"
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
            {LAYERS.map((layer) => (
              <g key={layer.name}>
                <text
                  x={layer.x}
                  y={26}
                  fontSize={11}
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {layer.name}
                </text>
                <line
                  x1={layer.x - 10}
                  y1={38}
                  x2={layer.x - 10}
                  y2={HEIGHT - 10}
                  stroke="var(--border)"
                  strokeDasharray="2 4"
                />
              </g>
            ))}
            {EDGES.map((edge) => {
              const path = edgePath(edge)
              if (!path) return null
              return (
                <path
                  key={`${edge[0]}:${edge[1]}`}
                  d={path}
                  fill="none"
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  markerEnd="url(#graph-preview-arrow)"
                />
              )
            })}
            {NODES.map((node) => {
              const selected = node.id === SELECTED_NODE
              return (
                <rect
                  key={node.id}
                  x={node.x}
                  y={NODE_TOP + node.row * ROW_GAP}
                  width={node.width}
                  height={NODE_HEIGHT}
                  rx={4}
                  fill={selected ? 'var(--accent)' : 'var(--muted)'}
                  stroke={selected ? 'var(--ring)' : 'var(--border)'}
                  strokeWidth={selected ? 1.5 : 1}
                />
              )
            })}
          </svg>
        </div>
      </CodePanel>
    </figure>
  )
}
