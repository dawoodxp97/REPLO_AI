import { TutorialContent, ValidationReport, type Stage } from '@replo/contracts'
import { z } from 'zod'
import type { Db } from '../../platform/db/client'
import { checkpointsRepo } from './checkpoints.repo'
import { LessonDraft } from './drafts'

export const WHOLE_JOB = 'all'
export const OVERVIEW_CHECKPOINT = 'overview'

export const lessonCheckpointKey = (lessonKey: string) => `lesson:${lessonKey}`
export const judgeCheckpointKey = (chapterKey: string) => `judge:${chapterKey}`

export const StoredSummaries = z.object({ files: z.record(z.string(), z.string()) })
export type StoredSummaries = z.infer<typeof StoredSummaries>

export const StoredRepair = z.object({ repaired: LessonDraft.nullable() })
export type StoredRepair = z.infer<typeof StoredRepair>

export const StoredJudge = z.object({ score: z.number().min(0).max(1) })
export type StoredJudge = z.infer<typeof StoredJudge>

export const StoredValidation = z.object({ content: TutorialContent, report: ValidationReport })
export type StoredValidation = z.infer<typeof StoredValidation>

export interface Checkpoints {
  read<S extends z.ZodType>(
    jobId: string,
    stage: Stage,
    checkpointKey: string,
    schema: S,
  ): Promise<z.output<S> | undefined>
  write(jobId: string, stage: Stage, checkpointKey: string, value: unknown): Promise<void>
  clear(jobId: string): Promise<void>
}

export function createCheckpoints(db: Db): Checkpoints {
  return {
    async read(jobId, stage, checkpointKey, schema) {
      const raw = await checkpointsRepo(db).find(jobId, stage, checkpointKey)
      return raw === undefined ? undefined : schema.parse(raw)
    },
    write: (jobId, stage, checkpointKey, value) =>
      checkpointsRepo(db).upsert(jobId, stage, checkpointKey, value),
    clear: (jobId) => checkpointsRepo(db).deleteForJob(jobId),
  }
}
