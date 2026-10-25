import type { DiagramBlock } from '@replo/contracts'
import { MAX_DIAGRAM_EDGES, renderFlowchart, type FlowEdge } from './mermaid'
import type { SourceIndex } from './source-index'

const MAX_GROUPS = 12
const NESTED_ROOTS = new Set(['src', 'lib', 'app', 'apps', 'packages'])
const UNSAFE_LABEL = /[^A-Za-z0-9_./ -]/g

export function groupOf(path: string): string | undefined {
  const segments = path.split('/')
  if (segments.length < 2) return undefined
  const first = segments[0] ?? ''
  if (NESTED_ROOTS.has(first) && segments.length > 2) return `${first}/${segments[1] ?? ''}`
  return first
}

export function structuralDiagram(index: SourceIndex): DiagramBlock | undefined {
  const sizes = new Map<string, number>()
  for (const file of index.files) {
    const group = groupOf(file.path)
    if (group) sizes.set(group, (sizes.get(group) ?? 0) + 1)
  }

  const groups = [...sizes.entries()]
    .sort(([nameA, sizeA], [nameB, sizeB]) => sizeB - sizeA || nameA.localeCompare(nameB))
    .slice(0, MAX_GROUPS)
    .map(([name]) => name)
  if (groups.length === 0) return undefined

  const entries = groups.map((name, position) => ({ name, id: `g${position}` }))
  const ids = new Map(entries.map(({ name, id }) => [name, id]))
  const edges = new Map<string, FlowEdge>()
  for (const edge of index.edges) {
    const from = groupOf(edge.fromPath)
    const to = groupOf(edge.toPath)
    const fromId = from === undefined ? undefined : ids.get(from)
    const toId = to === undefined ? undefined : ids.get(to)
    if (fromId === undefined || toId === undefined || fromId === toId) continue
    edges.set(`${fromId}>${toId}`, { from: fromId, to: toId })
  }

  return {
    type: 'diagram',
    mermaid: renderFlowchart({
      direction: 'LR',
      nodes: entries.map(({ name, id }) => ({ id, label: name.replace(UNSAFE_LABEL, '_') })),
      edges: [...edges.values()].slice(0, MAX_DIAGRAM_EDGES),
    }),
    nodeRefs: Object.fromEntries(entries.map(({ name, id }) => [id, name])),
    caption: 'Source groups and the imports between them, generated from the file graph.',
  }
}
