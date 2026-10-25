import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { normaliseOutline, repoMap, sourceIndexOf } from '../context'
import { ArchitectureAndOutlineDraft, ArchitectureDraft, OutlineDraft } from '../drafts'
import { WHOLE_JOB } from '../outputs'
import { dataSection, promptFor, systemFor } from '../prompts'
import { openSession, planOf, snapshotView, type StageDeps } from '../stage-deps'
import { StoredSummaries } from './summaries'

const LITE_MAX_CHAPTERS = 5
const FULL_MAX_CHAPTERS = 8
const MIN_CHAPTERS = 3

const maxChaptersOf = (ctx: StageContext) =>
  planOf(ctx).pipeline === 'lite' ? LITE_MAX_CHAPTERS : FULL_MAX_CHAPTERS

export async function runArchitecture(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.outputs.read(ctx.job.id, 'architecture', WHOLE_JOB, ArchitectureDraft)) return

  const { view, index, summaries } = await planningInputs(deps, ctx)
  const session = await openSession(deps, ctx)
  const system = systemFor(ctx.job.audience)
  const repoMapSection = dataSection('repo_map', repoMap(view, index, summaries))

  if (planOf(ctx).pipeline === 'full') {
    const drafted = await session.call('planner', {
      stage: 'architecture',
      system,
      prompt: `${promptFor('architecture')}\n\n${repoMapSection}`,
      schema: ArchitectureDraft,
      maxOutputTokens: 6000,
    })
    await deps.outputs.write(ctx.job.id, 'architecture', WHOLE_JOB, drafted)
    return
  }

  const planned = await session.call('planner', {
    stage: 'architecture',
    system,
    prompt: `${promptFor('architectureAndOutline', { min: MIN_CHAPTERS, max: LITE_MAX_CHAPTERS })}\n\n${repoMapSection}`,
    schema: ArchitectureAndOutlineDraft,
    maxOutputTokens: 8000,
  })
  await deps.outputs.write(ctx.job.id, 'architecture', WHOLE_JOB, planned.architecture)
  await deps.outputs.write(
    ctx.job.id,
    'outline',
    WHOLE_JOB,
    normaliseOutline(planned.outline, index, LITE_MAX_CHAPTERS),
  )
}

export async function runOutline(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.outputs.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)) return

  const maxChapters = maxChaptersOf(ctx)
  const { view, index, summaries } = await planningInputs(deps, ctx)
  const session = await openSession(deps, ctx)
  const drafted = await session.call('planner', {
    stage: 'outline',
    system: systemFor(ctx.job.audience),
    prompt: `${promptFor('outline', { min: MIN_CHAPTERS, max: maxChapters })}\n\n${dataSection('repo_map', repoMap(view, index, summaries))}`,
    schema: OutlineDraft,
    maxOutputTokens: 8000,
  })
  await deps.outputs.write(
    ctx.job.id,
    'outline',
    WHOLE_JOB,
    normaliseOutline(drafted, index, maxChapters),
  )
}

async function planningInputs(deps: StageDeps, ctx: StageContext) {
  const view = await snapshotView(deps, ctx)
  const index = sourceIndexOf(view, deps.indexing, ctx.job.snapshotId)
  const summaries =
    (await deps.outputs.read(ctx.job.id, 'summaries', WHOLE_JOB, StoredSummaries))?.files ?? {}
  return { view, index, summaries }
}
