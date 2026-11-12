import { ModelPlan, type Stage } from '@replo/contracts'
import type { z } from 'zod'
import type { StageContext } from '../../worker/generate-tutorial'
import { JobError } from '../../worker/errors'
import type { Db } from '../../platform/db/client'
import type { JobService } from '../jobs/jobs.service'
import type { IndexingService, SnapshotView } from '../indexing/indexing.service'
import type { TutorialPublisher } from '../tutorials/publisher.service'
import { sourceIndexOf } from './prompt-inputs'
import type { SourceIndex } from './grounding/source-index'
import { openLlm, type LlmDeps, type LlmSession } from './llm'
import type { Checkpoints } from './checkpoints'
import { systemFor } from './prompts'

export interface StageDeps {
  db: Db
  indexing: IndexingService
  checkpoints: Checkpoints
  llm: LlmDeps
  jobs: Pick<JobService, 'linkTutorial' | 'fenceRunning'>
  tutorials: TutorialPublisher
}

export interface SourceWorkspace {
  view: SnapshotView
  index: SourceIndex
}

export interface StageWorkspace extends SourceWorkspace {
  session: LlmSession
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
    keyId: ctx.job.providerKeyId,
    plan: planOf(ctx),
    system: systemFor(ctx.job.audience),
    budget: ctx.budget,
    signal: ctx.signal,
  })
}

export async function sourceWorkspace(
  deps: StageDeps,
  ctx: StageContext,
): Promise<SourceWorkspace> {
  const view = await snapshotView(deps, ctx)
  return { view, index: sourceIndexOf(view, deps.indexing, ctx.job.snapshotId) }
}

export async function stageWorkspace(deps: StageDeps, ctx: StageContext): Promise<StageWorkspace> {
  const workspace = await sourceWorkspace(deps, ctx)
  return { ...workspace, session: await openSession(deps, ctx) }
}

export async function checkpointed<S extends z.ZodType>(
  deps: StageDeps,
  ctx: StageContext,
  stage: Stage,
  checkpointKey: string,
  schema: S,
  produce: () => Promise<z.output<S>>,
): Promise<z.output<S>> {
  // Read before produce: after a crash or retry, a paid model call that already
  // succeeded is reused instead of repeated.
  const stored = await deps.checkpoints.read(ctx.job.id, stage, checkpointKey, schema)
  if (stored !== undefined) return stored
  const value = await produce()
  // A stage that ran past a cancel or timeout must not write its result (see withTimeout).
  ctx.signal.throwIfAborted()
  await deps.checkpoints.write(ctx.job.id, stage, checkpointKey, value)
  return value
}
