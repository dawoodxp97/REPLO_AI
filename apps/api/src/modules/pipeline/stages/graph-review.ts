import type { GraphLayer } from '@replo/contracts'
import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import { buildCourseGraph, repairGraph } from '../graph'
import { promptFor } from '../prompts'
import { dataFiles } from '../prompt-inputs'
import { EnrichDraft } from '../drafts'
import type { SourceIndex } from '../grounding/source-index'
import type { LlmSession } from '../llm'
import type { Enrichment } from '../enrichment'
import { StoredEnrichment, StoredGraph, WHOLE_JOB } from '../checkpoints'
import { checkpointed, openSession, planOf, sourceWorkspace, type StageDeps } from '../stage-tools'

const COVERAGE_TARGET = 0.8
const REPAIR_FILES = 12

export async function runGraphReview(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'graph-review', WHOLE_JOB, StoredGraph)) return

  const { view, index } = await sourceWorkspace(deps, ctx)
  const stored = await deps.checkpoints.read(ctx.job.id, 'enrich', WHOLE_JOB, StoredEnrichment)
  if (!stored) throw new JobError('ENRICHMENT_MISSING', false, 'graph review needs enrichment')

  let files: Enrichment = stored.files
  let graph = buildCourseGraph(view, files)
  let coverage = coverageOf(graph, files)

  // One deterministic repair pass: summarise the most central files that still lack a summary.
  if (coverage < COVERAGE_TARGET && planOf(ctx).pipeline !== 'lite') {
    const session = await openSession(deps, ctx)
    if (session.hasRole('summarizer')) {
      const missing = graph.nodes
        .filter((node) => node.kind === 'file' && node.path && !files[node.path])
        .map((node) => node.path as string)
        .slice(0, REPAIR_FILES)
      if (missing.length > 0) {
        const repaired = await repairSummaries(deps, ctx, session, index, missing)
        files = { ...files, ...repaired }
        graph = buildCourseGraph(view, files)
        coverage = coverageOf(graph, files)
        await deps.checkpoints.write(ctx.job.id, 'enrich', WHOLE_JOB, {
          files,
          concepts: stored.concepts,
        } satisfies StoredEnrichment)
      }
    }
  }

  const clean = repairGraph(graph)
  await deps.checkpoints.write(ctx.job.id, 'graph-review', WHOLE_JOB, {
    graph: clean,
    coverage,
  } satisfies StoredGraph)
}

function coverageOf(graph: ReturnType<typeof buildCourseGraph>, files: Enrichment) {
  const fileNodes = graph.nodes.filter((node) => node.kind === 'file')
  if (fileNodes.length === 0) return 1
  const covered = fileNodes.filter((node) => node.path && files[node.path]).length
  return Math.round((covered / fileNodes.length) * 1000) / 1000
}

async function repairSummaries(
  deps: StageDeps,
  ctx: StageContext,
  session: LlmSession,
  index: SourceIndex,
  paths: readonly string[],
): Promise<Enrichment> {
  const draft = await checkpointed(
    deps,
    ctx,
    'graph-review',
    'repair',
    EnrichDraft,
    async () => {
      await index.load(paths)
      return session.ask('summarizer', {
        stage: 'graph-review',
        sections: [promptFor('graphRepair'), dataFiles(index, paths)],
        schema: EnrichDraft,
        maxOutputTokens: 2000,
      })
    },
  )
  const allowed = new Set(paths)
  const repaired: Enrichment = {}
  for (const item of draft.files) {
    if (!allowed.has(item.path)) continue
    repaired[item.path] = { summary: item.summary, layer: item.layer as GraphLayer, domain: item.domain }
  }
  return repaired
}