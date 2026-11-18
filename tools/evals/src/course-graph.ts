import { GRAPH_EDGE_KINDS, type CourseGraph } from '@replo/contracts'
import { mean, ratio } from './statistics'
import type { SnapshotFacts, SnapshotLookup } from './snapshot'
import type { TruthSheet } from './truth-sheet'

export interface GraphScore {
  graphCoverage: number
  graphIntegrity: number
}

const FILE_NODE_PREFIX = 'file:'
const GRAPH_EDGE_KIND_SET = new Set<string>(GRAPH_EDGE_KINDS)
const MAPPED_SNAPSHOT_EDGE_KINDS = new Set(['import', 'call', 'extends', 'implements'])

export function scoreGraph(
  sheet: TruthSheet,
  snapshot: SnapshotFacts,
  lookup: SnapshotLookup,
  graph: CourseGraph,
): GraphScore {
  return {
    graphCoverage: coverageOf(sheet, snapshot, graph),
    graphIntegrity: integrityOf(snapshot, lookup, graph),
  }
}

function coverageOf(sheet: TruthSheet, snapshot: SnapshotFacts, graph: CourseGraph): number {
  const filePaths = filePathsOf(graph)
  const edgeKeys = graphEdgeKeys(graph)
  const entries = ratio(countPresent(sheet.entryPoints, filePaths), sheet.entryPoints.length)
  const modules = ratio(countPresent(sheet.coreModules, filePaths), sheet.coreModules.length)
  const flows = ratio(
    sheet.keyFlows.filter((flow) => flowCovered(flow.hops, filePaths, edgeKeys)).length,
    sheet.keyFlows.length,
  )
  const symbols = ratio(
    countPresent(sheet.graphSymbols, symbolKeysOf(graph)),
    sheet.graphSymbols.length,
  )
  const imports = snapshot.edges.filter((edge) => MAPPED_SNAPSHOT_EDGE_KINDS.has(edge.kind))
  const edges = ratio(
    imports.filter((edge) => edgeKeys.has(`${edge.fromPath}\u0000${edge.toPath}`)).length,
    imports.length,
  )
  return mean([entries, modules, flows, symbols, edges])
}

function integrityOf(snapshot: SnapshotFacts, lookup: SnapshotLookup, graph: CourseGraph): number {
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const checks: boolean[] = [
    nodeIds.size === graph.nodes.length,
    new Set(graph.edges.map((edge) => edge.id)).size === graph.edges.length,
  ]

  for (const edge of graph.edges) {
    checks.push(nodeIds.has(edge.from) && nodeIds.has(edge.to))
    checks.push(GRAPH_EDGE_KIND_SET.has(edge.kind))
  }

  for (const node of graph.nodes) {
    if (node.kind === 'file')
      checks.push(node.path !== undefined && lookup.file(node.path) !== undefined)
    if (node.kind === 'symbol') {
      const symbol = node.symbolKey === undefined ? undefined : lookup.symbol(node.symbolKey)
      checks.push(symbol !== undefined && symbol.path === node.path)
    }
  }

  if (graph.nodes.length === 0) checks.push(false)
  if (snapshot.files.length === 0) checks.push(false)
  return ratio(checks.filter(Boolean).length, checks.length)
}

function filePathsOf(graph: CourseGraph): ReadonlySet<string> {
  return new Set(
    graph.nodes
      .filter((node) => node.kind === 'file' && node.path !== undefined)
      .map((node) => node.path as string),
  )
}

function symbolKeysOf(graph: CourseGraph): ReadonlySet<string> {
  return new Set(
    graph.nodes
      .filter((node) => node.kind === 'symbol' && node.symbolKey !== undefined)
      .map((node) => node.symbolKey as string),
  )
}

function graphEdgeKeys(graph: CourseGraph): ReadonlySet<string> {
  return new Set(
    graph.edges
      .filter(
        (edge) => edge.from.startsWith(FILE_NODE_PREFIX) && edge.to.startsWith(FILE_NODE_PREFIX),
      )
      .map(
        (edge) =>
          `${edge.from.slice(FILE_NODE_PREFIX.length)}\u0000${edge.to.slice(FILE_NODE_PREFIX.length)}`,
      ),
  )
}

function countPresent(expected: readonly string[], present: ReadonlySet<string>): number {
  return [...new Set(expected)].filter((path) => present.has(path)).length
}

function flowCovered(
  hops: readonly string[],
  filePaths: ReadonlySet<string>,
  edgeKeys: ReadonlySet<string>,
): boolean {
  if (hops.length === 0) return false
  if (!hops.every((hop) => filePaths.has(hop))) return false
  return hops.slice(1).every((hop, position) => edgeKeys.has(`${hops[position]}\u0000${hop}`))
}
