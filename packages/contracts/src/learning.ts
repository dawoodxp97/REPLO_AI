import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OffsetCursor, pageInput } from './common'

export const LESSON_STATUSES = ['in_progress', 'completed'] as const
export const LessonStatus = z.enum(LESSON_STATUSES)
export type LessonStatus = z.infer<typeof LessonStatus>

export const ProgressDto = z.object({
  tutorialId: z.uuid(),
  versionId: z.uuid(),
  lessons: z.record(z.string(), LessonStatus),
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  nextLessonKey: z.string().nullable(),
  quizAttempts: z.number().int().nonnegative(),
})
export type ProgressDto = z.infer<typeof ProgressDto>

export const QuizResultDto = z.object({
  correct: z.boolean(),
  correctKey: z.string(),
  explanation: z.string(),
})
export type QuizResultDto = z.infer<typeof QuizResultDto>

export const HistoryEntryDto = z.object({
  lessonKey: z.string(),
  title: z.string(),
  status: LessonStatus,
  at: z.iso.datetime(),
})
export type HistoryEntryDto = z.infer<typeof HistoryEntryDto>

export const HistoryPage = z.object({
  items: z.array(HistoryEntryDto),
  nextCursor: z.string().nullable(),
})
export type HistoryPage = z.infer<typeof HistoryPage>

export const learningContract = {
  getProgress: oc
    .route({ method: 'GET', path: '/learning/{tutorialId}/progress' })
    .input(z.object({ tutorialId: z.uuid(), versionId: z.uuid().optional() }))
    .output(ProgressDto),
  history: oc
    .route({ method: 'GET', path: '/learning/{tutorialId}/history' })
    .input(pageInput(OffsetCursor).extend({ tutorialId: z.uuid(), versionId: z.uuid().optional() }))
    .output(HistoryPage),
  markLesson: oc
    .route({ method: 'POST', path: '/learning/lessons' })
    .input(z.object({ versionId: z.uuid(), lessonKey: z.string(), status: LessonStatus }))
    .output(ProgressDto),
  unmarkLesson: oc
    .route({ method: 'POST', path: '/learning/unmark-lesson' })
    .input(z.object({ versionId: z.uuid(), lessonKey: z.string() }))
    .output(ProgressDto),
  submitQuiz: oc
    .route({ method: 'POST', path: '/learning/quiz' })
    .input(
      z.object({
        versionId: z.uuid(),
        lessonKey: z.string(),
        questionKey: z.string(),
        choiceKey: z.string(),
      }),
    )
    .output(QuizResultDto),
}
