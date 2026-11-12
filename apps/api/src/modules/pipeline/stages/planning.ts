import type { StageContext } from '../../../worker/generate-tutorial'
import { FALLBACK_FILES, normaliseOutline, rankedPaths, repoMap } from '../prompt-inputs'
import { ArchitectureAndOutlineDraft, ArchitectureDraft, OutlineDraft } from '../drafts'
import { dataSection, promptFor } from '../prompts'
import { StoredSummaries, WHOLE_JOB } from '../checkpoints'
import {
  checkpointed,
  planOf,
  stageWorkspace,
  type StageDeps,
  type StageWorkspace,
} from '../stage-tools'

const LITE_MAX_CHAPTERS = 5
const FULL_MAX_CHAPTERS = 8
const MIN_CHAPTERS = 3

const maxChaptersOf = (ctx: StageContext) =>
  planOf(ctx).pipeline === 'lite' ? LITE_MAX_CHAPTERS : FULL_MAX_CHAPTERS

export async function runArchitecture(deps: StageDeps, ctx: StageContext): Promise<void> {
  await checkpointed(deps, ctx, 'architecture', WHOLE_JOB, ArchitectureDraft, async () => {
    const workspace = await planningWorkspace(deps, ctx)
    const repoMapSection = repoMapSectionOf(workspace)

    if (planOf(ctx).pipeline === 'full')
      return workspace.session.ask('planner', {
        stage: 'architecture',
        sections: [promptFor('architecture'), repoMapSection],
        schema: ArchitectureDraft,
        maxOutputTokens: 6000,
      })

    const planned = await workspace.session.ask('planner', {
      stage: 'architecture',
      sections: [
        promptFor('architectureAndOutline', { min: MIN_CHAPTERS, max: LITE_MAX_CHAPTERS }),
        repoMapSection,
      ],
      schema: ArchitectureAndOutlineDraft,
      maxOutputTokens: 8000,
    })
    await checkpointed(deps, ctx, 'outline', WHOLE_JOB, OutlineDraft, async () =>
      outlineFrom(planned.outline, workspace, LITE_MAX_CHAPTERS),
    )
    return planned.architecture
  })
}

export async function runOutline(deps: StageDeps, ctx: StageContext): Promise<void> {
  await checkpointed(deps, ctx, 'outline', WHOLE_JOB, OutlineDraft, async () => {
    const maxChapters = maxChaptersOf(ctx)
    const workspace = await planningWorkspace(deps, ctx)
    const drafted = await workspace.session.ask('planner', {
      stage: 'outline',
      sections: [
        promptFor('outline', { min: MIN_CHAPTERS, max: maxChapters }),
        repoMapSectionOf(workspace),
      ],
      schema: OutlineDraft,
      maxOutputTokens: 8000,
    })
    return outlineFrom(drafted, workspace, maxChapters)
  })
}

interface PlanningWorkspace extends StageWorkspace {
  summaries: Readonly<Record<string, string>>
}

async function planningWorkspace(deps: StageDeps, ctx: StageContext): Promise<PlanningWorkspace> {
  const workspace = await stageWorkspace(deps, ctx)
  const stored = await deps.checkpoints.read(ctx.job.id, 'summaries', WHOLE_JOB, StoredSummaries)
  return { ...workspace, summaries: stored?.files ?? {} }
}

function repoMapSectionOf({ view, index, summaries }: PlanningWorkspace): string {
  return dataSection('repo_map', repoMap(view, index, summaries))
}

function outlineFrom(
  draft: OutlineDraft,
  { view, index }: StageWorkspace,
  maxChapters: number,
): OutlineDraft {
  return normaliseOutline(draft, index, maxChapters, rankedPaths(view, FALLBACK_FILES))
}
