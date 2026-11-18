import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import type { SnapshotView } from '../../indexing/indexing.service'
import {
  FALLBACK_FILES,
  graphSection,
  normaliseOutline,
  rankedPaths,
  repoMap,
  toursSection,
} from '../prompt-inputs'
import { OutlineDraft } from '../drafts'
import { promptFor, dataSection } from '../prompts'
import {
  StoredEnrichment,
  StoredGraph,
  StoredTours,
  WHOLE_JOB,
} from '../checkpoints'
import { isLiteRun, stageWorkspace, type StageDeps } from '../stage-tools'

const LITE_MAX_CHAPTERS = 5
const FULL_MAX_CHAPTERS = 8
const MIN_CHAPTERS = 3

const maxChaptersOf = (deps: StageDeps, ctx: StageContext, view: SnapshotView) =>
  isLiteRun(deps, ctx, view) ? LITE_MAX_CHAPTERS : FULL_MAX_CHAPTERS

export async function runOutline(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)) return

  const graph = await deps.checkpoints.read(ctx.job.id, 'graph-review', WHOLE_JOB, StoredGraph)
  const tours = await deps.checkpoints.read(ctx.job.id, 'tours', WHOLE_JOB, StoredTours)
  if (!graph) throw new JobError('GRAPH_MISSING', false, 'the outline needs a reviewed graph')

  const workspace = await stageWorkspace(deps, ctx)
  const stored = await deps.checkpoints.read(ctx.job.id, 'enrich', WHOLE_JOB, StoredEnrichment)
  const maxChapters = maxChaptersOf(deps, ctx, workspace.view)

  const drafted = await workspace.session.ask('planner', {
    stage: 'outline',
    sections: [
      promptFor('outline', { min: MIN_CHAPTERS, max: maxChapters }),
      dataSection(
        'repo_map',
        repoMap(
          workspace.view,
          workspace.index,
          Object.fromEntries(
            Object.entries(stored?.files ?? {}).map(([path, value]) => [path, value.summary]),
          ),
        ),
      ),
      toursSection(tours?.tours ?? []),
      graphSection(graph.graph),
    ],
    schema: OutlineDraft,
    maxOutputTokens: 8000,
  })

  const outline = normaliseOutline(drafted, workspace.index, maxChapters, rankedPaths(workspace.view, FALLBACK_FILES))
  await deps.checkpoints.write(ctx.job.id, 'outline', WHOLE_JOB, outline)
}