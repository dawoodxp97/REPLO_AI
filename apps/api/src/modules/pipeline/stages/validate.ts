import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { ArchitectureDraft, OutlineDraft } from '../drafts'
import { buildReport } from '../grounding/report'
import { structuralDiagram } from '../grounding/structure'
import { StoredValidation, WHOLE_JOB } from '../stored-outputs'
import { stageWorkspace, type StageDeps } from '../stage-deps'
import { assembleContent } from './assemble-content'
import { groundChapters } from './ground-chapters'

export async function runValidate(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.outputs.read(ctx.job.id, 'validate', WHOLE_JOB, StoredValidation)) return

  const architecture = await deps.outputs.read(
    ctx.job.id,
    'architecture',
    WHOLE_JOB,
    ArchitectureDraft,
  )
  const outline = await deps.outputs.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)
  if (!architecture || !outline)
    throw new JobError('OUTLINE_MISSING', false, 'validation needs an architecture and an outline')

  const workspace = await stageWorkspace(deps, ctx)
  const grounded = await groundChapters(deps, ctx, workspace, { architecture, outline })
  const { view, index } = workspace

  const content = assembleContent({
    repo: { owner: view.owner, name: view.name, commitSha: view.commitSha },
    audience: ctx.job.audience,
    outline,
    architecture,
    diagram: structuralDiagram(index),
    grounded,
  })

  ctx.signal.throwIfAborted()
  await deps.outputs.write(ctx.job.id, 'validate', WHOLE_JOB, {
    content,
    report: buildReport(grounded.outcomes, grounded.judgeScores),
  })
}
