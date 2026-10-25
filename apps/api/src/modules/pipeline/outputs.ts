import type { Stage } from '@replo/contracts'
import type { z } from 'zod'
import type { Db } from '../../platform/db/client'
import { stageOutputsRepo } from './pipeline.repo'

export const WHOLE_JOB = 'all'

export interface StageOutputs {
  read<S extends z.ZodType>(
    jobId: string,
    stage: Stage,
    unit: string,
    schema: S,
  ): Promise<z.output<S> | undefined>
  write(jobId: string, stage: Stage, unit: string, value: unknown): Promise<void>
  clear(jobId: string): Promise<void>
  clearForJobs(jobIds: readonly string[]): Promise<void>
}

export function createStageOutputs(db: Db): StageOutputs {
  return {
    async read(jobId, stage, unit, schema) {
      const raw = await stageOutputsRepo(db).find(jobId, stage, unit)
      return raw === undefined ? undefined : schema.parse(raw)
    },
    write: (jobId, stage, unit, value) => stageOutputsRepo(db).upsert(jobId, stage, unit, value),
    clear: (jobId) => stageOutputsRepo(db).deleteForJobs([jobId]),
    clearForJobs: (jobIds) => stageOutputsRepo(db).deleteForJobs(jobIds),
  }
}
