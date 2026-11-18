import { Tour, type CourseGraph, type GraphNode, type TourStep } from '@replo/contracts'
import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import { graphSection } from '../prompt-inputs'
import { promptFor } from '../prompts'
import { ToursDraft, type TourDraft } from '../drafts'
import { fileNodeId, nodeIds } from '../graph'
import type { Flow } from '../enrichment'
import { FLOWS_CHECKPOINT, StoredFlows, StoredGraph, StoredTours, WHOLE_JOB } from '../checkpoints'
import { checkpointed, isLiteRun, openSession, sourceWorkspace, type StageDeps } from '../stage-tools'

const MAX_TOURS = 3

export async function runTours(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'tours', WHOLE_JOB, StoredTours)) return

  const { view } = await sourceWorkspace(deps, ctx)
  const stored = await deps.checkpoints.read(ctx.job.id, 'graph-review', WHOLE_JOB, StoredGraph)
  if (!stored) throw new JobError('GRAPH_MISSING', false, 'tours need a reviewed graph')
  const { graph } = stored
  const ids = nodeIds(graph)

  let tours = await modelTours(deps, ctx, graph, ids, isLiteRun(deps, ctx, view))
  if (tours.length === 0) {
    const flows = await deps.checkpoints.read(ctx.job.id, 'enrich', FLOWS_CHECKPOINT, StoredFlows)
    tours = deterministicTours(graph, flows?.flows ?? [])
  }

  await deps.checkpoints.write(ctx.job.id, 'tours', WHOLE_JOB, { tours } satisfies StoredTours)
}

async function modelTours(
  deps: StageDeps,
  ctx: StageContext,
  graph: CourseGraph,
  ids: ReadonlySet<string>,
  lite: boolean,
): Promise<Tour[]> {
  if (lite) return []
  const session = await openSession(deps, ctx)
  if (!session.hasRole('planner')) return []

  const draft = await checkpointed(deps, ctx, 'tours', WHOLE_JOB, ToursDraft, async () =>
    session.ask('planner', {
      stage: 'tours',
      sections: [promptFor('tours'), graphSection(graph)],
      schema: ToursDraft,
      maxOutputTokens: 4000,
    }),
  )

  return draft.tours
    .slice(0, MAX_TOURS)
    .map((tour) => sanitizeTour(tour, ids))
    .filter((tour): tour is Tour => tour !== undefined)
}

function sanitizeTour(draft: TourDraft, ids: ReadonlySet<string>): Tour | undefined {
  const steps: TourStep[] = draft.steps
    .filter((step) => ids.has(step.nodeId))
    .map((step) => ({
      title: step.title,
      summary: step.summary,
      nodeId: step.nodeId,
      ...(step.lessonKey ? { lessonKey: step.lessonKey } : {}),
    }))
  if (steps.length < 2) return undefined
  return Tour.parse({ key: draft.key, title: draft.title, objective: draft.objective, steps })
}

function deterministicTours(graph: CourseGraph, flows: readonly Flow[]): Tour[] {
  const fileIds = new Set(
    graph.nodes.filter((node) => node.kind === 'file').map((node) => node.id),
  )
  const labelOf = new Map(graph.nodes.map((node) => [node.id, node.label]))
  const summaryOf = new Map(graph.nodes.map((node) => [node.id, node.summary]))

  const flowTours: Tour[] = flows
    .map((flow, position) => {
      const steps: TourStep[] = flow.steps
        .map((path) => fileNodeId(path))
        .filter((id) => fileIds.has(id))
        .map((id) => ({
          title: labelOf.get(id) ?? id,
          summary: summaryOf.get(id) ?? flow.summary,
          nodeId: id,
        }))
      if (steps.length < 2) return undefined
      return Tour.parse({
        key: `flow-${position + 1}`,
        title: flow.name,
        objective: flow.summary,
        steps,
      })
    })
    .filter((tour): tour is Tour => tour !== undefined)

  if (flowTours.length > 0) return flowTours.slice(0, MAX_TOURS)

  const files = orderedFiles(graph).slice(0, 8)
  if (files.length < 2) return []
  const steps: TourStep[] = files.map((node) => ({
    title: node.label,
    summary: node.summary ?? 'A file in this repository.',
    nodeId: node.id,
  }))
  return [
    Tour.parse({
      key: 'orientation',
      title: 'Orientation',
      objective: 'Start at the repository entry points and follow the imports outward.',
      steps,
    }),
  ]
}

const DEPENDENCY_EDGES = new Set(['imports', 'extends', 'implements'])

function orderedFiles(graph: CourseGraph): GraphNode[] {
  const files = graph.nodes
    .filter((node) => node.kind === 'file' && node.path)
    .sort((a, b) => a.id.localeCompare(b.id))
  const byId = new Map(files.map((node) => [node.id, node]))
  const outgoing = new Map<string, string[]>()
  const incoming = new Map<string, number>()

  for (const edge of graph.edges) {
    if (!DEPENDENCY_EDGES.has(edge.kind)) continue
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue
    const targets = outgoing.get(edge.from) ?? []
    targets.push(edge.to)
    outgoing.set(edge.from, targets)
    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1)
  }

  const roots = files.filter((node) => (incoming.get(node.id) ?? 0) === 0)
  const ordered: GraphNode[] = []
  const seen = new Set<string>()
  const queue = roots.length > 0 ? [...roots] : [...files]

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node || seen.has(node.id)) continue
    seen.add(node.id)
    ordered.push(node)
    for (const target of outgoing.get(node.id) ?? []) {
      const next = byId.get(target)
      if (next && !seen.has(next.id)) queue.push(next)
    }
  }

  for (const node of files) if (!seen.has(node.id)) ordered.push(node)
  return ordered
}
