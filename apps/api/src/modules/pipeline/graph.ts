import type { CourseGraph, GraphEdge, GraphNode } from '@replo/contracts'
import type { SnapshotView } from '../indexing/indexing.service'
import type { Enrichment } from './enrichment'
import { groupOf } from './grounding/structure'

export const fileNodeId = (path: string) => `file:${path}`
export const groupNodeId = (name: string) => `group:${name}`
export const domainNodeId = (name: string) => `domain:${name}`
export const symbolNodeId = (symbolKey: string) => `sym:${symbolKey}`

export const MAX_FILE_NODES = 200
export const MAX_SYMBOL_NODES = 80
export const MAX_GRAPH_EDGES = 800

const SYMBOL_NODE_KINDS = new Set(['class', 'interface', 'type', 'enum'])

export interface RankedFile {
  path: string
  rank: number
}

// Files ordered by structural importance (PageRank), then path for determinism.
export function rankedFiles(view: SnapshotView): RankedFile[] {
  return view.files
    .map((file) => ({ path: file.path, rank: view.analysis?.metrics[file.path]?.pageRank ?? 0 }))
    .sort((a, b) => b.rank - a.rank || a.path.localeCompare(b.path))
}

// The deterministic, model-independent view of the repository: file, module (directory group),
// domain and symbol nodes with the import and containment edges between them. Semantic fields
// (layer, domain, summary) are folded in when enrichment is supplied; otherwise the graph is the
// purely structural one the index stage persists.
export function buildCourseGraph(view: SnapshotView, enrichment: Enrichment): CourseGraph {
  const selected = rankedFiles(view)
    .slice(0, MAX_FILE_NODES)
    .map((file) => file.path)
  const selectedSet = new Set(selected)
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seenEdges = new Set<string>()

  const addEdge = (from: string, to: string, kind: GraphEdge['kind']) => {
    if (from === to) return
    const id = `${kind}|${from}|${to}`
    if (seenEdges.has(id)) return
    seenEdges.add(id)
    edges.push({ id, from, to, kind })
  }

  for (const path of selected) {
    const extra = enrichment[path]
    nodes.push({
      id: fileNodeId(path),
      kind: 'file',
      label: path,
      path,
      ...(extra
        ? { layer: extra.layer, domain: extra.domain, summary: extra.summary }
        : {}),
    })
  }

  const groups = new Set<string>()
  for (const path of selected) {
    const group = groupOf(path)
    if (group) groups.add(group)
  }
  for (const group of [...groups].sort()) {
    nodes.push({ id: groupNodeId(group), kind: 'module', label: group })
  }

  const domains = new Set<string>()
  for (const path of selected) {
    const domain = enrichment[path]?.domain
    if (domain) domains.add(domain)
  }
  for (const domain of [...domains].sort()) {
    nodes.push({ id: domainNodeId(domain), kind: 'domain', label: domain })
  }

  let symbolCount = 0
  for (const path of selected) {
    for (const symbol of view.symbols) {
      if (symbolCount >= MAX_SYMBOL_NODES) break
      if (symbol.path !== path || !symbol.exported || !SYMBOL_NODE_KINDS.has(symbol.kind)) continue
      const id = symbolNodeId(symbol.symbolKey)
      nodes.push({ id, kind: 'symbol', label: symbol.name, path, symbolKey: symbol.symbolKey })
      addEdge(fileNodeId(path), id, 'contains')
      symbolCount += 1
    }
  }

  for (const path of selected) {
    const group = groupOf(path)
    if (group) addEdge(groupNodeId(group), fileNodeId(path), 'contains')
    const domain = enrichment[path]?.domain
    if (domain) addEdge(domainNodeId(domain), fileNodeId(path), 'contains')
  }

  for (const edge of view.edges) {
    if (edge.kind !== 'import') continue
    if (!selectedSet.has(edge.fromPath) || !selectedSet.has(edge.toPath)) continue
    addEdge(fileNodeId(edge.fromPath), fileNodeId(edge.toPath), 'imports')
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id))
  edges.sort((a, b) => a.id.localeCompare(b.id))
  return { nodes, edges: edges.slice(0, MAX_GRAPH_EDGES) }
}

// The purely structural graph persisted by the index stage.
export function structuralGraph(view: SnapshotView): CourseGraph {
  return buildCourseGraph(view, {})
}

export function nodeIds(graph: CourseGraph): Set<string> {
  return new Set(graph.nodes.map((node) => node.id))
}

// Deterministic referential-integrity check: every edge endpoint must be a declared node and
// every id must be unique. Returns the graph with dangling edges removed.
export function repairGraph(graph: CourseGraph): CourseGraph {
  const ids = new Set<string>()
  const nodes = graph.nodes.filter((node) => {
    if (ids.has(node.id)) return false
    ids.add(node.id)
    return true
  })
  const edges = graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to))
  return { nodes, edges }
}