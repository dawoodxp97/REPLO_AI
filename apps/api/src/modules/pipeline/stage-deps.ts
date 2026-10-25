import { ModelPlan } from '@replo/contracts'
import type { StageContext } from '../../jobs/generate-tutorial.worker'
import { JobError } from '../../jobs/errors'
import type { Db } from '../../platform/db/client'
import type { JobService } from '../generation/jobs.service'
import type { IndexingService, SnapshotView } from '../indexing/indexing.service'
import type { TutorialPublisher } from '../tutorials/publisher.service'
import { openLlm, type LlmDeps, type LlmSession } from './llm'
import type { StageOutputs } from './outputs'

export interface StageDeps {
  db: Db
  indexing: IndexingService
  outputs: StageOutputs
  llm: LlmDeps
  jobs: Pick<JobService, 'linkTutorial'>
  tutorials: TutorialPublisher
}

export async function snapshotView(deps: StageDeps, ctx: StageContext): Promise<SnapshotView> {
  const view = await deps.indexing.readView(ctx.job.snapshotId)
  if (!view) throw new JobError('SNAPSHOT_MISSING', false)
  return view
}

export function planOf(ctx: StageContext) {
  return ModelPlan.parse(ctx.job.models)
}

export function openSession(deps: StageDeps, ctx: StageContext): Promise<LlmSession> {
  return openLlm(deps.llm, {
    jobId: ctx.job.id,
    userId: ctx.job.userId,
    keyId: ctx.job.keyId,
    plan: planOf(ctx),
    budget: ctx.budget,
    signal: ctx.signal,
  })
}
