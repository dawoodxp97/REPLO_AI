import type { Catalog, LanguageModel, RunContext } from '@replo/ai'
import type { Stage } from '@replo/contracts'
import type { StageHandler } from '../../jobs/generate-tutorial.worker'
import type { Db } from '../../platform/db/client'
import type { JobService } from '../generation/jobs.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeysService } from '../keys/keys.service'
import type { TutorialPublisher } from '../tutorials/publisher.service'
import { createStageOutputs } from './outputs'
import type { StageDeps } from './stage-deps'
import { runLessons } from './stages/lessons'
import { runArchitecture, runOutline } from './stages/planning'
import { runPublish } from './stages/publish'
import { runSummaries } from './stages/summaries'
import { runValidate } from './stages/validate'

export interface PipelineDeps {
  db: Db
  indexing: IndexingService
  keys: KeysService
  catalog: Catalog
  resolve?: (run: RunContext, modelId: string) => LanguageModel
  jobs: Pick<JobService, 'linkTutorial'>
  tutorials: TutorialPublisher
}

export interface PipelineService {
  stageHandlers: Record<Stage, StageHandler>
  purgeOutputs(jobIds: readonly string[]): Promise<void>
}

export function createPipelineService(deps: PipelineDeps): PipelineService {
  const outputs = createStageOutputs(deps.db)
  const stageDeps: StageDeps = {
    db: deps.db,
    indexing: deps.indexing,
    outputs,
    llm: { catalog: deps.catalog, keys: deps.keys, resolve: deps.resolve },
    jobs: deps.jobs,
    tutorials: deps.tutorials,
  }

  return {
    purgeOutputs: (jobIds) => outputs.clearForJobs(jobIds),
    stageHandlers: {
      ingest: ({ job, signal }) =>
        deps.indexing.ingest({ userId: job.userId, snapshotId: job.snapshotId, signal }),
      index: ({ job, signal }) =>
        deps.indexing.index({ userId: job.userId, snapshotId: job.snapshotId, signal }),
      summaries: (ctx) => runSummaries(stageDeps, ctx),
      architecture: (ctx) => runArchitecture(stageDeps, ctx),
      outline: (ctx) => runOutline(stageDeps, ctx),
      lessons: (ctx) => runLessons(stageDeps, ctx),
      validate: (ctx) => runValidate(stageDeps, ctx),
      publish: (ctx) => runPublish(stageDeps, ctx),
    },
  }
}
