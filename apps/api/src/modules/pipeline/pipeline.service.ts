import type { Catalog, LanguageModel, RunContext } from '@replo/ai'
import type { Stage } from '@replo/contracts'
import type { StageHandler } from '../../worker/generate-course'
import type { Db } from '../../platform/db/client'
import type { JobService } from '../jobs/jobs.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeysService } from '../keys/keys.service'
import type { CoursePublisher } from '../courses/publisher.service'
import { createCheckpoints } from './checkpoints'
import { structuralGraph } from './graph'
import { DEFAULT_LITE_MAX_FILES, type StageDeps } from './stage-tools'
import { runDiagrams } from './stages/diagrams'
import { runEnrich } from './stages/enrich'
import { runGraphReview } from './stages/graph-review'
import { runLessons } from './stages/lessons'
import { runOutline } from './stages/outline'
import { runPublish } from './stages/publish'
import { runTours } from './stages/tours'
import { runValidate } from './stages/validate'

export interface PipelineDeps {
  db: Db
  indexing: IndexingService
  keys: KeysService
  catalog: Catalog
  resolve?: (run: RunContext, modelId: string) => LanguageModel
  jobs: Pick<JobService, 'linkCourse' | 'fenceRunning'>
  courses: CoursePublisher
  liteMaxFiles?: number
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
    courses: deps.courses,
    liteMaxFiles: deps.liteMaxFiles ?? DEFAULT_LITE_MAX_FILES,
  }

  return {
    stageHandlers: {
      ingest: ({ job, signal }) =>
        deps.indexing.ingest({ userId: job.userId, snapshotId: job.snapshotId, signal }),
      index: async ({ job, signal }) => {
        await deps.indexing.index({ userId: job.userId, snapshotId: job.snapshotId, signal })
        const view = await deps.indexing.readView(job.snapshotId)
        if (view) await deps.indexing.storeGraph(job.snapshotId, structuralGraph(view))
      },
      enrich: (ctx) => runEnrich(stageDeps, ctx),
      'graph-review': (ctx) => runGraphReview(stageDeps, ctx),
      tours: (ctx) => runTours(stageDeps, ctx),
      diagrams: (ctx) => runDiagrams(stageDeps, ctx),
      outline: (ctx) => runOutline(stageDeps, ctx),
      lessons: (ctx) => runLessons(stageDeps, ctx),
      validate: (ctx) => runValidate(stageDeps, ctx),
      publish: (ctx) => runPublish(stageDeps, ctx),
    },
  }
}