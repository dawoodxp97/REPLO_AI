export interface DirectedEdge {
  from: string
  to: string
}

export function reachableIds(
  edges: readonly DirectedEdge[],
  startId: string,
  direction: 'incoming' | 'outgoing',
): Set<string> {
  const reachable = new Set<string>()
  const queue = [startId]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) break
    for (const edge of edges) {
      const next =
        direction === 'outgoing'
          ? edge.from === current
            ? edge.to
            : undefined
          : edge.to === current
            ? edge.from
            : undefined
      if (next !== undefined && next !== startId && !reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }
  return reachable
}
