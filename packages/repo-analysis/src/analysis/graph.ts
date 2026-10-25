export interface Edge {
  from: string
  to: string
}

export interface NodeMetrics {
  fanIn: number
  fanOut: number
  pageRank: number
}

const DAMPING = 0.85
const ITERATIONS = 40

export function pageRank(nodes: readonly string[], edges: readonly Edge[]): Map<string, number> {
  const ordered = [...nodes].sort()
  const n = ordered.length
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    const targets = outgoing.get(edge.from) ?? []
    targets.push(edge.to)
    outgoing.set(edge.from, targets)
  }
  let rank = new Map(ordered.map((node) => [node, 1 / n]))
  for (let step = 0; step < ITERATIONS && n > 0; step += 1) {
    const next = new Map(ordered.map((node) => [node, (1 - DAMPING) / n]))
    let dangling = 0
    for (const node of ordered) {
      const share = rank.get(node) ?? 0
      const targets = outgoing.get(node)
      if (!targets || targets.length === 0) {
        dangling += share
        continue
      }
      const portion = (DAMPING * share) / targets.length
      for (const target of targets) next.set(target, (next.get(target) ?? 0) + portion)
    }
    for (const node of ordered) next.set(node, (next.get(node) ?? 0) + (DAMPING * dangling) / n)
    rank = next
  }
  return rank
}

export function metricsFor(
  nodes: readonly string[],
  edges: readonly Edge[],
): Map<string, NodeMetrics> {
  const fanIn = new Map<string, number>()
  const fanOut = new Map<string, number>()
  for (const edge of edges) {
    fanOut.set(edge.from, (fanOut.get(edge.from) ?? 0) + 1)
    fanIn.set(edge.to, (fanIn.get(edge.to) ?? 0) + 1)
  }
  const ranks = pageRank(nodes, edges)
  return new Map(
    nodes.map((node) => [
      node,
      {
        fanIn: fanIn.get(node) ?? 0,
        fanOut: fanOut.get(node) ?? 0,
        pageRank: Number((ranks.get(node) ?? 0).toFixed(6)),
      },
    ]),
  )
}
