import { TutorialContent, ValidationReport } from '@replo/contracts'
import { z } from 'zod'
import { LessonDraft } from './drafts'

export const WHOLE_JOB = 'all'
export const OVERVIEW_UNIT = 'overview'

export const lessonUnit = (key: string) => `lesson:${key}`
export const judgeUnit = (chapterKey: string) => `judge:${chapterKey}`

export const StoredSummaries = z.object({ files: z.record(z.string(), z.string()) })
export type StoredSummaries = z.infer<typeof StoredSummaries>

export const StoredRepair = z.object({ repaired: LessonDraft.nullable() })
export type StoredRepair = z.infer<typeof StoredRepair>

export const StoredJudge = z.object({ score: z.number().min(0).max(1) })
export type StoredJudge = z.infer<typeof StoredJudge>

export const StoredValidation = z.object({ content: TutorialContent, report: ValidationReport })
export type StoredValidation = z.infer<typeof StoredValidation>
