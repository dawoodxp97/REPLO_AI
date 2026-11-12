import type { Catalog, LanguageModel, RunContext } from '@replo/ai'
import type { Stage } from '@replo/contracts'
import type { StageHandler } from '../../worker/generate-tutorial'
import type { Db } from '../../platform/db/client'
import type { JobService } from '../jobs/jobs.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeysService } from '../keys/keys.service'
import type { TutorialPublisher } from '../tutorials/publisher.service'
import { createCheckpoints } from './checkpoints'
import type { StageDeps } from './stage-tools'
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
  jobs: Pick<JobService, 'linkTutorial' | 'fenceRunning'>
  tutorials: TutorialPublisher
}

export interface PipelineService {
  stageHandlers: Record<Stage, StageHandler>
}

export function createPipelineService(deps: PipelineDeps): PipelineService {
  const checkpoints = createCheckpoints(deps.db)
  const stageDeps: StageDeps = {
    db: deps.db,
    indexing: deps.indexing,
    checkpoints,
    llm: { catalog: deps.catalog, keys: deps.keys, resolve: deps.resolve },
    jobs: deps.jobs,
    tutorials: deps.tutorials,
  }

  return {
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
