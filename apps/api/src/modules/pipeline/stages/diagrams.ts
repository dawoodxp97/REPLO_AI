import {
  DiagramSpec,
  type CourseGraph,
  type DiagramEdge,
  type DiagramNode,
  type GraphNode,
} from '@replo/contracts'
import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import { graphSection, repoMap } from '../prompt-inputs'
import { promptFor, dataSection } from '../prompts'
import { ArchitectureDraft, DiagramsDraft, type DiagramDraft } from '../drafts'
import { fileNodeId, groupNodeId, nodeIds } from '../graph'
import { groupOf } from '../grounding/structure'
import type { SourceIndex } from '../grounding/source-index'
import type { SnapshotView } from '../../indexing/indexing.service'
import { StoredDiagrams, StoredEnrichment, StoredGraph, WHOLE_JOB } from '../checkpoints'
import { checkpointed, openSession, planOf, sourceWorkspace, type StageDeps } from '../stage-tools'

export async function runDiagrams(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'diagrams', WHOLE_JOB, StoredDiagrams)) return

  const { view, index } = await sourceWorkspace(deps, ctx)
  const stored = await deps.checkpoints.read(ctx.job.id, 'graph-review', WHOLE_JOB, StoredGraph)
  if (!stored) throw new JobError('GRAPH_MISSING', false, 'diagrams need a reviewed graph')
  const { graph } = stored
  const ids = nodeIds(graph)

  const diagrams = [...systemDiagrams(graph)]
  diagrams.push(...(await modelDiagrams(deps, ctx, graph, ids)))
  const architecture = await overviewArchitecture(deps, ctx, view, index)

  await deps.checkpoints.write(ctx.job.id, 'diagrams', WHOLE_JOB, {
    diagrams,
    architecture,
  } satisfies StoredDiagrams)
}

// system diagrams
function toDiagramNode(node: GraphNode): DiagramNode {
  return { id: node.id, label: node.label, kind: node.kind, refIds: [] }
}

function diagramEdge(id: string, from: string, to: string): DiagramEdge {
  return { id, from, to, refIds: [] }
}

function systemDiagrams(graph: CourseGraph): DiagramSpec[] {
  const groupNodes = graph.nodes.filter((node) => node.kind === 'module')
  const fileNodes = graph.nodes.filter((node) => node.kind === 'file')
  const symbolNodes = graph.nodes.filter((node) => node.kind === 'symbol')
  const ids = nodeIds(graph)

  const architecture = spec(
    'architecture',
    'Architecture',
    'Modules and the imports between them.',
    groupNodes,
    groupEdges(graph, ids),
  )
  const tree = spec(
    'tree',
    'Module tree',
    'How the module groups nest.',
    groupNodes,
    treeEdges(groupNodes, ids),
  )
  const classDiagram = spec(
    'class',
    'Core types',
    'Exported classes, interfaces and types and the files that declare them.',
    [...fileNodes.filter((n) => symbolNodes.some((s) => s.path === n.path)), ...symbolNodes],
    symbolNodes.map((s) => diagramEdge(`e:${fileNodeId(s.path as string)}>${s.id}`, fileNodeId(s.path as string), s.id)),
  )
  const entityFiles = new Set(
    fileNodes
      .filter((node) => symbolNodes.some((s) => s.path === node.path && s.label.match(/^[A-Z]/)))
      .map((node) => node.id),
  )
  const erd = spec(
    'erd',
    'Data entities',
    'Files that declare the repository’s main types and how they depend on each other.',
    fileNodes.filter((node) => entityFiles.has(node.id)),
    importEdgesAmong(graph, entityFiles),
  )

  return [architecture, tree, classDiagram, erd].filter(
    (diagram): diagram is DiagramSpec => diagram !== undefined,
  )
}

function spec(
  id: 'architecture' | 'tree' | 'class' | 'erd',
  title: string,
  caption: string,
  nodes: readonly GraphNode[],
  edges: readonly DiagramEdge[],
): DiagramSpec | undefined {
  const list = dedupeNodes(nodes.map(toDiagramNode))
  if (list.length < 2) return undefined
  return DiagramSpec.parse({ id, type: id, title, caption, nodes: list, edges: dedupeEdges(edges) })
}

function groupEdges(graph: CourseGraph, ids: ReadonlySet<string>): DiagramEdge[] {
  const groupOfNode = new Map(
    graph.nodes.filter((n) => n.kind === 'file').map((n) => [n.id, n.path ? groupOf(n.path) : undefined]),
  )
  const edges: DiagramEdge[] = []
  for (const item of graph.edges) {
    if (item.kind !== 'imports') continue
    const from = groupOfNode.get(item.from)
    const to = groupOfNode.get(item.to)
    if (!from || !to || from === to) continue
    const fromId = groupNodeId(from)
    const toId = groupNodeId(to)
    if (!ids.has(fromId) || !ids.has(toId)) continue
    edges.push(diagramEdge(`e:${fromId}>${toId}`, fromId, toId))
  }
  return edges
}

function importEdgesAmong(graph: CourseGraph, fileIds: ReadonlySet<string>): DiagramEdge[] {
  const edges: DiagramEdge[] = []
  for (const item of graph.edges) {
    if (item.kind !== 'imports') continue
    if (!fileIds.has(item.from) || !fileIds.has(item.to)) continue
    edges.push(diagramEdge(`e:${item.from}>${item.to}`, item.from, item.to))
  }
  return edges
}

function treeEdges(groupNodes: readonly GraphNode[], ids: ReadonlySet<string>): DiagramEdge[] {
  const present = new Set(groupNodes.map((node) => node.id))
  const edges: DiagramEdge[] = []
  for (const node of groupNodes) {
    const name = node.id.slice('group:'.length)
    const slash = name.lastIndexOf('/')
    if (slash <= 0) continue
    const parentId = groupNodeId(name.slice(0, slash))
    if (!present.has(parentId) || !ids.has(parentId)) continue
    edges.push(diagramEdge(`e:${parentId}>${node.id}`, parentId, node.id))
  }
  return edges
}

function dedupeNodes(nodes: readonly DiagramNode[]): DiagramNode[] {
  const seen = new Set<string>()
  return nodes.filter((node) => (seen.has(node.id) ? false : (seen.add(node.id), true)))
}

function dedupeEdges(edges: readonly DiagramEdge[]): DiagramEdge[] {
  const seen = new Set<string>()
  return edges.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
}

// model diagrams
async function modelDiagrams(
  deps: StageDeps,
  ctx: StageContext,
  graph: CourseGraph,
  ids: ReadonlySet<string>,
): Promise<DiagramSpec[]> {
  if (planOf(ctx).pipeline === 'lite') return []
  const session = await openSession(deps, ctx)
  if (!session.hasRole('planner')) return []

  let draft: DiagramsDraft | undefined
  try {
    draft = await checkpointed(deps, ctx, 'diagrams', 'model', DiagramsDraft, async () =>
      session.ask('planner', {
        stage: 'diagrams',
        sections: [promptFor('diagrams'), graphSection(graph)],
        schema: DiagramsDraft,
        maxOutputTokens: 6000,
      }),
    )
  } catch (err) {
    if (err instanceof JobError && err.code === 'LLM_OUTPUT_INVALID') return []
    throw err
  }

  return draft.diagrams
    .map((item) => validateDiagram(item, ids))
    .filter((diagram): diagram is DiagramSpec => diagram !== undefined)
}

function validateDiagram(draft: DiagramDraft, ids: ReadonlySet<string>): DiagramSpec | undefined {
  const nodes: DiagramNode[] = draft.nodes
    .filter((node) => ids.has(node.id))
    .map((node) => ({ id: node.id, label: node.label, kind: node.kind, refIds: [] }))
  const kept = new Set(nodes.map((node) => node.id))
  const edges: DiagramEdge[] = draft.edges
    .filter((item) => kept.has(item.from) && kept.has(item.to))
    .map((item, position) => ({
      id: `e${position}:${item.from}>${item.to}`,
      from: item.from,
      to: item.to,
      ...(item.label ? { label: item.label } : {}),
      refIds: [],
    }))
  if (nodes.length < 2 || edges.length === 0) return undefined
  return DiagramSpec.parse({
    id: draft.id,
    type: draft.type,
    title: draft.title,
    caption: draft.caption,
    nodes,
    edges,
  })
}

// overview architecture
async function overviewArchitecture(
  deps: StageDeps,
  ctx: StageContext,
  view: SnapshotView,
  index: SourceIndex,
): Promise<ArchitectureDraft> {
  const fallback = (md: string): ArchitectureDraft =>
    ArchitectureDraft.parse({ blocks: [{ type: 'callout', tone: 'note', md }], openQuestions: [] })

  if (planOf(ctx).pipeline === 'lite') {
    return fallback(
      `${view.analysis?.framework ?? 'This repository'} — ${view.files.length} files. The tour below walks the graph from its entry points outward.`,
    )
  }

  const stored = await deps.checkpoints.read(ctx.job.id, 'enrich', WHOLE_JOB, StoredEnrichment)
  const session = await openSession(deps, ctx)
  if (!session.hasRole('planner')) return fallback('No planner model was available for the overview.')

  const repoMapSection = dataSection(
    'repo_map',
    repoMap(
      view,
      index,
      Object.fromEntries(Object.entries(stored?.files ?? {}).map(([p, e]) => [p, e.summary])),
    ),
  )
  return session.ask('planner', {
    stage: 'diagrams',
    sections: [promptFor('architecture'), repoMapSection],
    schema: ArchitectureDraft,
    maxOutputTokens: 3000,
  })
}