import type { DiagramSpec, SourceRef } from '@replo/contracts'
import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import { OutlineDraft, type ArchitectureDraft } from '../drafts'
import { refIdFor } from '../grounding/evidence'
import { buildReport } from '../grounding/report'
import type { SourceIndex } from '../grounding/source-index'
import { StoredDiagrams, StoredGraph, StoredTours, StoredValidation, WHOLE_JOB } from '../checkpoints'
import { stageWorkspace, type StageDeps } from '../stage-tools'
import { assembleContent } from './assemble-content'
import { groundChapters } from './ground-chapters'

export async function runValidate(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'validate', WHOLE_JOB, StoredValidation)) return

  const diagrams = await deps.checkpoints.read(ctx.job.id, 'diagrams', WHOLE_JOB, StoredDiagrams)
  const graph = await deps.checkpoints.read(ctx.job.id, 'graph-review', WHOLE_JOB, StoredGraph)
  const tours = await deps.checkpoints.read(ctx.job.id, 'tours', WHOLE_JOB, StoredTours)
  const outline = await deps.checkpoints.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)
  if (!diagrams || !graph || !outline)
    throw new JobError('OUTLINE_MISSING', false, 'validation needs diagrams, a graph and an outline')

  const architecture: ArchitectureDraft = diagrams.architecture
  const workspace = await stageWorkspace(deps, ctx)
  const grounded = await groundChapters(deps, ctx, workspace, { architecture, outline })

  // Resolve diagram nodes to source refs so the viewer can show evidence chips.
  const refs: Record<string, SourceRef> = {}
  const resolved = await attachDiagramRefs(diagrams.diagrams, workspace.index, refs)

  const content = assembleContent({
    repo: { owner: workspace.view.owner, name: workspace.view.name, commitSha: workspace.view.commitSha },
    audience: ctx.job.audience,
    outline,
    architecture,
    graph: graph.graph,
    tours: tours?.tours ?? [],
    diagrams: resolved,
    grounded,
    extraRefs: refs,
  })

  ctx.signal.throwIfAborted()
  await deps.checkpoints.write(ctx.job.id, 'validate', WHOLE_JOB, {
    content,
    report: buildReport(grounded.outcomes),
  })
}

async function attachDiagramRefs(
  diagrams: readonly DiagramSpec[],
  index: SourceIndex,
  refs: Record<string, SourceRef>,
): Promise<DiagramSpec[]> {
  const paths = new Set<string>()
  for (const diagram of diagrams)
    for (const node of diagram.nodes) {
      if (!node.id.startsWith('file:')) continue
      const path = node.id.slice('file:'.length)
      if (index.file(path)) paths.add(path)
    }
  await index.load(paths)
  return diagrams.map((diagram) => ({
    ...diagram,
    nodes: diagram.nodes.map((node) => {
      const ref = refForNode(index, node.id)
      if (!ref) return node
      const refId = refIdFor(ref)
      refs[refId] = ref
      return { ...node, refIds: [refId] }
    }),
  }))
}

function refForNode(index: SourceIndex, nodeId: string): SourceRef | undefined {
  if (nodeId.startsWith('file:')) {
    const path = nodeId.slice('file:'.length)
    const file = index.file(path)
    const lines = index.lines(path)
    if (!file || !lines) return undefined
    return { path, startLine: 1, endLine: lines.length, blobSha: file.blobSha }
  }
  if (nodeId.startsWith('sym:')) {
    const symbol = index.symbol(nodeId.slice('sym:'.length))
    if (!symbol) return undefined
    const file = index.file(symbol.path)
    if (!file) return undefined
    return {
      path: symbol.path,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      blobSha: file.blobSha,
      symbolKey: symbol.symbolKey,
    }
  }
  return undefined
}