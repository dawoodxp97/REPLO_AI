import type { CourseGraph, GraphEdge, GraphNode } from '@replo/contracts'

export const GRAPH_LAYERS = ['api', 'service', 'data', 'ui', 'util', 'other'] as const
export type GraphLayerName = (typeof GRAPH_LAYERS)[number]

const NODE_WIDTH = 176
const NODE_HEIGHT = 44
const COLUMN_WIDTH = 216
const ROW_HEIGHT = 60
const TOP = 24
const LEFT = 16
const MAX_NODES = 80

export interface PositionedNode {
  node: GraphNode
  layer: GraphLayerName
  x: number
  y: number
  width: number
  height: number
}

export interface PositionedEdge {
  edge: GraphEdge
  path: string
}

export interface GraphLayout {
  width: number
  height: number
  layers: { name: GraphLayerName; x: number; count: number }[]
  nodes: PositionedNode[]
  edges: PositionedEdge[]
  hiddenNodes: number
}

export function layoutGraph(graph: CourseGraph): GraphLayout {
  const degree = degrees(graph)
  const ordered = [...graph.nodes].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.label.localeCompare(b.label),
  )
  const visible = ordered.slice(0, MAX_NODES)
  const visibleIds = new Set(visible.map((node) => node.id))
  const grouped = new Map<GraphLayerName, GraphNode[]>()
  for (const node of visible) {
    const layer = layerOf(node)
    grouped.set(layer, [...(grouped.get(layer) ?? []), node])
  }

  const nodes: PositionedNode[] = []
  const layers: GraphLayout['layers'] = []
  let column = 0
  let tallest = 0
  for (const layer of GRAPH_LAYERS) {
    const members = grouped.get(layer)
    if (!members) continue
    const x = LEFT + column * COLUMN_WIDTH
    layers.push({ name: layer, x, count: members.length })
    tallest = Math.max(tallest, members.length)
    members.forEach((node, row) => {
      nodes.push({
        node,
        layer,
        x,
        y: TOP + row * ROW_HEIGHT,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    })
    column += 1
  }

  const byId = new Map(nodes.map((positioned) => [positioned.node.id, positioned]))
  const edges = graph.edges.flatMap((edge) => {
    if (!visibleIds.has(edge.from) || !visibleIds.has(edge.to)) return []
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) return []
    return [{ edge, path: edgePath(from, to) }]
  })

  return {
    width: Math.max(COLUMN_WIDTH, layers.length * COLUMN_WIDTH + LEFT),
    height: Math.max(ROW_HEIGHT, TOP + tallest * ROW_HEIGHT),
    layers,
    nodes,
    edges,
    hiddenNodes: graph.nodes.length - visible.length,
  }
}

function layerOf(node: GraphNode): GraphLayerName {
  return GRAPH_LAYERS.find((layer) => layer === node.layer) ?? 'other'
}

function degrees(graph: CourseGraph): Map<string, number> {
  const degree = new Map<string, number>()
  for (const edge of graph.edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }
  return degree
}

function edgePath(from: PositionedNode, to: PositionedNode): string {
  if (from.node.id === to.node.id) {
    const startX = from.x + from.width
    const startY = from.y + from.height / 2
    return `M ${startX} ${startY} C ${startX + 40} ${startY - 30}, ${startX + 40} ${startY + 30}, ${startX} ${startY + 8}`
  }
  const startX = from.x + from.width
  const startY = from.y + from.height / 2
  const endX = to.x
  const endY = to.y + to.height / 2
  const bend = Math.max(36, Math.abs(endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
}
