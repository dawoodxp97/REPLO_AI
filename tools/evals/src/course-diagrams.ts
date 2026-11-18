import type { CourseContent } from '@replo/contracts'
import { refInvalidReason } from './course-references'
import type { SnapshotLookup } from './snapshot'
import { ratio } from './statistics'

export interface DiagramScore {
  diagramValidity: number
  issues: string[]
}

export function scoreDiagrams(content: CourseContent, lookup: SnapshotLookup): DiagramScore {
  const issues: string[] = []
  const graphNodeIds = new Set(content.graph.nodes.map((node) => node.id))
  const checks: boolean[] = [uniqueIds(content.diagrams.map((diagram) => diagram.id))]

  for (const diagram of content.diagrams) {
    checks.push(uniqueIds(diagram.nodes.map((node) => node.id)))
    checks.push(uniqueIds(diagram.edges.map((edge) => edge.id)))
    const nodeIds = new Set(diagram.nodes.map((node) => node.id))
    for (const node of diagram.nodes) {
      const known = graphNodeIds.has(node.id)
      checks.push(known)
      if (!known) issues.push(`${diagram.id}: node ${node.id} is not in the graph`)
      checks.push(...node.refIds.map((refId) => refResolves(content, refId, lookup)))
      for (const refId of node.refIds)
        if (!refResolves(content, refId, lookup))
          issues.push(`${diagram.id}: node ${node.id} ref ${refId} does not resolve`)
    }
    for (const edge of diagram.edges) {
      const endpoints = nodeIds.has(edge.from) && nodeIds.has(edge.to)
      checks.push(endpoints)
      if (!endpoints) issues.push(`${diagram.id}: edge ${edge.id} has a missing endpoint`)
      for (const refId of edge.refIds) {
        const resolves = refResolves(content, refId, lookup)
        checks.push(resolves)
        if (!resolves) issues.push(`${diagram.id}: edge ${edge.id} ref ${refId} does not resolve`)
      }
    }
  }

  const architecture = content.architecture?.diagram
  if (architecture) {
    for (const [nodeId, path] of Object.entries(architecture.nodeRefs)) {
      const exists = lookup.file(path) !== undefined || lookup.hasDirectory(path)
      checks.push(exists)
      if (!exists) issues.push(`architecture: node ${nodeId} path ${path} not found`)
    }
  }

  return { diagramValidity: ratio(checks.filter(Boolean).length, checks.length), issues }
}

function uniqueIds(ids: readonly string[]): boolean {
  return new Set(ids).size === ids.length
}

function refResolves(content: CourseContent, refId: string, lookup: SnapshotLookup): boolean {
  const ref = content.sourceRefs[refId]
  return ref !== undefined && refInvalidReason(ref, lookup) === undefined
}
