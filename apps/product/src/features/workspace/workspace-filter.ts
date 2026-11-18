import type { CourseGraph, SourceTreeEntryDto } from '@replo/contracts'

export function filterGraph(graph: CourseGraph, query: string): CourseGraph {
  const needle = query.trim().toLowerCase()
  if (needle === '') return graph
  const nodes = graph.nodes.filter((node) =>
    [node.label, node.path, node.domain, node.summary]
      .filter((value): value is string => value !== undefined)
      .some((value) => value.toLowerCase().includes(needle)),
  )
  const ids = new Set(nodes.map((node) => node.id))
  return {
    nodes,
    edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  }
}

export function filterSourceTree(
  files: readonly SourceTreeEntryDto[],
  query: string,
): SourceTreeEntryDto[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...files]
  return files.filter((file) => file.path.toLowerCase().includes(needle))
}
