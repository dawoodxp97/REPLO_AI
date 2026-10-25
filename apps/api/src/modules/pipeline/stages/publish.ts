import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { PIPELINE_VERSION, PROMPT_HASHES, PROMPT_VERSIONS } from '../prompts'
import { WHOLE_JOB } from '../outputs'
import { planOf, snapshotView, type StageDeps } from '../stage-deps'
import type { TutorialGenerator } from '../../../platform/db/schema'
import { StoredValidation } from './validate'

export async function runPublish(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.tutorials.versionForJob(ctx.job.id)) return

  const stored = await deps.outputs.read(ctx.job.id, 'validate', WHOLE_JOB, StoredValidation)
  if (!stored) throw new JobError('VALIDATION_MISSING', false, 'publish needs a validated tutorial')

  const view = await snapshotView(deps, ctx)
  const plan = planOf(ctx)
  const analysis = view.analysis
  if (!analysis) throw new JobError('ANALYSIS_MISSING', false, 'publish needs a snapshot analysis')
  const generator: TutorialGenerator = {
    pipeline: plan.pipeline,
    pipelineVersion: PIPELINE_VERSION,
    analyzerVersion: analysis.analyzerVersion,
    models: plan.models,
    promptVersions: PROMPT_VERSIONS,
    promptHashes: PROMPT_HASHES,
    budgetMicros: ctx.job.budgetMicros,
    spentMicros: ctx.budget.spentMicros,
  }

  await deps.db.transaction(async (tx) => {
    const published = await deps.tutorials.publishVersion(tx, {
      userId: ctx.job.userId,
      repositoryId: view.repositoryId,
      snapshotId: ctx.job.snapshotId,
      jobId: ctx.job.id,
      audience: stored.content.meta.audience,
      content: stored.content,
      report: stored.report,
      generator,
    })
    await deps.jobs.linkTutorial(tx, ctx.job.id, published.tutorialId)
  })
  await deps.outputs.clear(ctx.job.id)
}
