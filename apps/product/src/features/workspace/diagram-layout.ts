import type { DiagramSpec } from '@replo/contracts'

const NODE_WIDTH = 168
const NODE_HEIGHT = 44
const COLUMN_WIDTH = 208
const ROW_HEIGHT = 64
const TOP = 24
const LEFT = 16
const PADDING = 16

export interface DiagramNodePosition {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface DiagramEdgePath {
  id: string
  from: string
  to: string
  label?: string
  path: string
  labelX: number
  labelY: number
}

export interface DiagramLayout {
  width: number
  height: number
  nodes: DiagramNodePosition[]
  edges: DiagramEdgePath[]
}

export function layoutDiagram(diagram: DiagramSpec): DiagramLayout {
  const levels = levelsOf(diagram)
  const columns = new Map<number, DiagramSpec['nodes']>()
  diagram.nodes.forEach((node, index) => {
    const level = levels.get(node.id) ?? index
    columns.set(level, [...(columns.get(level) ?? []), node])
  })

  const positions = new Map<string, DiagramNodePosition>()
  const orderedLevels = [...columns.keys()].sort((a, b) => a - b)
  let tallest = 0
  orderedLevels.forEach((level, column) => {
    const members = columns.get(level) ?? []
    tallest = Math.max(tallest, members.length)
    members.forEach((node, row) => {
      positions.set(node.id, {
        id: node.id,
        label: node.label,
        x: LEFT + column * COLUMN_WIDTH,
        y: TOP + row * ROW_HEIGHT,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })
    })
  })

  const edges = diagram.edges.flatMap((edge) => {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) return []
    return [
      {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        ...(edge.label === undefined ? {} : { label: edge.label }),
        path: edgePath(from, to),
        labelX: (from.x + from.width + to.x) / 2,
        labelY: (from.y + to.y + to.height) / 2,
      },
    ]
  })

  return {
    width: Math.max(COLUMN_WIDTH, orderedLevels.length * COLUMN_WIDTH + LEFT) + PADDING,
    height: Math.max(ROW_HEIGHT, TOP + tallest * ROW_HEIGHT + PADDING),
    nodes: [...positions.values()],
    edges,
  }
}

function levelsOf(diagram: DiagramSpec): Map<string, number> {
  const incoming = new Map<string, string[]>()
  for (const node of diagram.nodes) incoming.set(node.id, [])
  for (const edge of diagram.edges) incoming.get(edge.to)?.push(edge.from)

  const levels = new Map<string, number>()
  const visiting = new Set<string>()

  const levelOf = (id: string): number => {
    const known = levels.get(id)
    if (known !== undefined) return known
    if (visiting.has(id)) return 0
    visiting.add(id)
    const parents = incoming.get(id) ?? []
    const level =
      parents.length === 0
        ? 0
        : Math.max(...parents.map((parent) => Math.min(levelOf(parent) + 1, diagram.nodes.length)))
    visiting.delete(id)
    levels.set(id, level)
    return level
  }

  for (const node of diagram.nodes) levelOf(node.id)
  return levels
}

function edgePath(from: DiagramNodePosition, to: DiagramNodePosition): string {
  const startX = from.x + from.width
  const startY = from.y + from.height / 2
  const endX = to.x
  const endY = to.y + to.height / 2
  if (from.id === to.id) {
    return `M ${startX} ${startY} C ${startX + 36} ${startY - 24}, ${startX + 36} ${startY + 24}, ${startX} ${startY + 10}`
  }
  const bend = Math.max(32, Math.abs(endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
}
