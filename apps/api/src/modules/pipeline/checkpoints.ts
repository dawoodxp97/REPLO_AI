import {
  CourseContent,
  CourseGraph,
  DiagramSpec,
  GRAPH_LAYERS,
  Tour,
  ValidationReport,
  type Stage,
} from '@replo/contracts'
import { z } from 'zod'
import type { Db } from '../../platform/db/client'
import { checkpointsRepo } from './checkpoints.repo'
import { ArchitectureDraft, LessonDraft } from './drafts'

export const WHOLE_JOB = 'all'
export const OVERVIEW_CHECKPOINT = 'overview'
export const FLOWS_CHECKPOINT = 'flows'

export const enrichBatchKey = (batch: number) => `batch:${batch}`
export const lessonCheckpointKey = (lessonKey: string) => `lesson:${lessonKey}`

export const StoredEnrichment = z.object({
  files: z.record(
    z.string(),
    z.object({ summary: z.string(), layer: z.enum(GRAPH_LAYERS), domain: z.string() }),
  ),
  concepts: z.array(z.object({ term: z.string(), summary: z.string() })),
})
export type StoredEnrichment = z.infer<typeof StoredEnrichment>

export const StoredFlows = z.object({
  flows: z.array(
    z.object({ name: z.string(), summary: z.string(), steps: z.array(z.string()) }),
  ),
})
export type StoredFlows = z.infer<typeof StoredFlows>

export const StoredGraph = z.object({ graph: CourseGraph, coverage: z.number() })
export type StoredGraph = z.infer<typeof StoredGraph>

export const StoredTours = z.object({ tours: z.array(Tour) })
export type StoredTours = z.infer<typeof StoredTours>

export const StoredDiagrams = z.object({
  diagrams: z.array(DiagramSpec),
  architecture: ArchitectureDraft,
})
export type StoredDiagrams = z.infer<typeof StoredDiagrams>

export const StoredRepair = z.object({ repaired: LessonDraft.nullable() })
export type StoredRepair = z.infer<typeof StoredRepair>

export const StoredValidation = z.object({ content: CourseContent, report: ValidationReport })
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