import { normalisePath } from './evidence'
import type { SourceIndex } from './source-index'

const MAX_DIAGRAM_NODES = 40
export const MAX_DIAGRAM_EDGES = 80
const MAX_DIAGRAM_LINES = 160
const MAX_NODE_ID_LENGTH = 32
const MAX_NODE_LABEL_LENGTH = 80
const MAX_EDGE_LABEL_LENGTH = 60

const DIRECTIONS = ['TD', 'TB', 'LR', 'RL', 'BT'] as const
type Direction = (typeof DIRECTIONS)[number]

const HEADER = new RegExp(`^(?:flowchart|graph)\\s+(${DIRECTIONS.join('|')})$`)
const LABEL_CHARACTER = '[^"[\\]()<>`;|{}]'
const NODE_ID = `[A-Za-z][A-Za-z0-9_]{0,${MAX_NODE_ID_LENGTH - 1}}`
const NODE_LABEL = `${LABEL_CHARACTER}{1,${MAX_NODE_LABEL_LENGTH}}`
const NODE = new RegExp(
  `^(${NODE_ID})\\s*(?:\\["(${NODE_LABEL})"\\]|\\[(${NODE_LABEL})\\]|\\((${NODE_LABEL})\\))?$`,
)
const EDGE_LABEL = new RegExp(`^\\|(${LABEL_CHARACTER}{1,${MAX_EDGE_LABEL_LENGTH}})\\|$`)

function isDirection(value: string | undefined): value is Direction {
  return DIRECTIONS.some((direction) => direction === value)
}

interface FlowNode {
  id: string
  label?: string
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

interface ParsedDiagram {
  direction: Direction
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface CheckedDiagram {
  mermaid: string
  nodeRefs: Record<string, string>
  unverifiedHops: number
}

export type DiagramVerdict =
  | { ok: true; diagram: CheckedDiagram }
  | { ok: false; reason: 'INVALID_SYNTAX' | 'TOO_LARGE' | 'UNMAPPED_NODE' | 'NO_VERIFIED_HOPS' }

export function parseDiagram(source: string): ParsedDiagram | undefined {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const direction = HEADER.exec(lines[0] ?? '')?.[1]
  if (!isDirection(direction) || lines.length > MAX_DIAGRAM_LINES) return undefined

  const nodes = new Map<string, FlowNode>()
  const edges: FlowEdge[] = []

  for (const line of lines.slice(1)) {
    const parts = line.split('-->')
    if (parts.length === 1) {
      const node = parseNode(line)
      if (!node) return undefined
      declare(nodes, node)
      continue
    }
    if (parts.length !== 2) return undefined
    const from = parseNode(parts[0] ?? '')
    const target = parseEdgeTarget(parts[1] ?? '')
    if (!from || !target) return undefined
    declare(nodes, from)
    declare(nodes, target.node)
    edges.push({
      from: from.id,
      to: target.node.id,
      ...(target.label ? { label: target.label } : {}),
    })
  }

  return { direction, nodes: [...nodes.values()], edges }
}

export function checkDiagram(
  source: string,
  nodeRefs: Readonly<Record<string, string>>,
  index: SourceIndex,
): DiagramVerdict {
  const parsed = parseDiagram(source)
  if (!parsed) return { ok: false, reason: 'INVALID_SYNTAX' }
  if (parsed.nodes.length > MAX_DIAGRAM_NODES || parsed.edges.length > MAX_DIAGRAM_EDGES)
    return { ok: false, reason: 'TOO_LARGE' }

  const paths = new Map(
    Object.entries(nodeRefs).map(([id, raw]) => [id, normalisePath(raw)] as const),
  )
  for (const node of parsed.nodes) {
    const path = paths.get(node.id)
    if (path === undefined || !(index.file(path) || index.hasDirectory(path)))
      return { ok: false, reason: 'UNMAPPED_NODE' }
  }

  const pathOf = (id: string) => paths.get(id) ?? ''
  const verified = parsed.edges.filter((edge) => index.connects(pathOf(edge.from), pathOf(edge.to)))
  if (verified.length === 0) return { ok: false, reason: 'NO_VERIFIED_HOPS' }

  const usedIds = new Set(verified.flatMap((edge) => [edge.from, edge.to]))
  const kept = parsed.nodes.filter((node) => usedIds.has(node.id))
  return {
    ok: true,
    diagram: {
      mermaid: renderFlowchart({ direction: parsed.direction, nodes: kept, edges: verified }),
      nodeRefs: Object.fromEntries(kept.map((node) => [node.id, pathOf(node.id)])),
      unverifiedHops: parsed.edges.length - verified.length,
    },
  }
}

export function renderFlowchart(input: {
  direction: Direction
  nodes: readonly FlowNode[]
  edges: readonly FlowEdge[]
}): string {
  const lines = [`flowchart ${input.direction}`]
  for (const node of input.nodes)
    lines.push(node.label ? `  ${node.id}["${node.label}"]` : `  ${node.id}`)
  for (const edge of input.edges)
    lines.push(
      edge.label ? `  ${edge.from} -->|${edge.label}| ${edge.to}` : `  ${edge.from} --> ${edge.to}`,
    )
  return lines.join('\n')
}

function parseNode(text: string): FlowNode | undefined {
  const match = NODE.exec(text.trim())
  if (!match?.[1]) return undefined
  const label = match[2] ?? match[3] ?? match[4]
  return label ? { id: match[1], label } : { id: match[1] }
}

function parseEdgeTarget(text: string): { node: FlowNode; label?: string } | undefined {
  const trimmed = text.trim()
  const labelled = /^(\|[^|]*\|)\s*(.+)$/.exec(trimmed)
  if (!labelled) {
    const node = parseNode(trimmed)
    return node ? { node } : undefined
  }
  const label = EDGE_LABEL.exec(labelled[1] ?? '')?.[1]
  const node = parseNode(labelled[2] ?? '')
  if (!label || !node) return undefined
  return { node, label }
}

function declare(nodes: Map<string, FlowNode>, node: FlowNode): void {
  const existing = nodes.get(node.id)
  if (!existing || (!existing.label && node.label)) nodes.set(node.id, node)
}
