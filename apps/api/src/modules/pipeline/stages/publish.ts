import type { StageContext } from '../../../worker/generate-tutorial'
import { JobError } from '../../../worker/errors'
import { PIPELINE_VERSION, PROMPT_HASHES, PROMPT_VERSIONS } from '../prompts'
import { StoredValidation, WHOLE_JOB } from '../checkpoints'
import { planOf, snapshotView, type StageDeps } from '../stage-tools'
import type { TutorialGenerator } from '../../../platform/db/schema'

export async function runPublish(deps: StageDeps, ctx: StageContext): Promise<void> {
  // The worker can die after the publish commit but before completeStage. On redelivery
  // the version already exists, so only the cleanup is left.
  if (await deps.tutorials.versionForJob(ctx.job.id)) {
    await deps.checkpoints.clear(ctx.job.id)
    return
  }

  const stored = await deps.checkpoints.read(ctx.job.id, 'validate', WHOLE_JOB, StoredValidation)
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
    await deps.jobs.fenceRunning(tx, ctx.job.id, ctx.job.attempts)
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
  await deps.checkpoints.clear(ctx.job.id)
}
