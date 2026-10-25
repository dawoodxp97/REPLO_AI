import { ORPCError } from '@orpc/server'
import type {
  DashboardSummary,
  HistoryPage,
  LessonStatus,
  ProgressDto,
  QuizResultDto,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { badRequest, notFound } from '../../platform/errors'
import type { Viewer } from '../tutorials/access'
import type { ReadableVersion, TutorialReader } from '../tutorials/reader.service'
import { learningRepo } from './learning.repo'

interface LearningDeps {
  db: Db
  tutorials: TutorialReader
}

export type ResumeTarget = NonNullable<DashboardSummary['resume']>

export interface LearningService {
  progress(
    userId: string,
    input: { tutorialId: string; versionId?: string | undefined },
  ): Promise<ProgressDto>
  history(
    userId: string,
    input: {
      tutorialId: string
      versionId?: string | undefined
      limit: number
      cursor?: string | undefined
    },
  ): Promise<HistoryPage>
  markLesson(
    userId: string,
    input: { versionId: string; lessonKey: string; status: LessonStatus },
  ): Promise<ProgressDto>
  unmarkLesson(
    userId: string,
    input: { versionId: string; lessonKey: string },
  ): Promise<ProgressDto>
  submitQuiz(
    userId: string,
    input: { versionId: string; lessonKey: string; questionKey: string; choiceKey: string },
  ): Promise<QuizResultDto>
  completionRatio(viewer: Viewer, versionId: string): Promise<number | null>
  completionRatios(
    userId: string,
    targets: readonly { tutorialId: string; versionId: string }[],
  ): Promise<Map<string, number | null>>
  resumeTarget(userId: string): Promise<ResumeTarget | null>
}

const RESUME_CANDIDATES = 20

function ratioOf(done: number, total: number): number | null {
  return total === 0 ? null : done / total
}

export function createLearningService(deps: LearningDeps): LearningService {
  const { db, tutorials } = deps
  const repo = learningRepo(db)

  const readableOrUndefined = async (viewer: Viewer, versionId: string) => {
    try {
      return await tutorials.readableVersion(viewer, versionId)
    } catch (error) {
      if (error instanceof ORPCError && error.code === 'NOT_FOUND') return undefined
      throw error
    }
  }

  const resolveReadableVersion = async (
    userId: string,
    tutorialId: string,
    versionId: string | undefined,
  ) => {
    const version = await tutorials.readableVersion(
      { userId },
      versionId ?? (await tutorials.currentVersionOf({ userId }, tutorialId)),
    )
    if (version.tutorialId !== tutorialId) notFound('Tutorial version')
    return version
  }

  const lessonBoard = async (reader: Viewer & { userId: string }, version: ReadableVersion) => {
    const { userId } = reader
    const entries = await tutorials.lessonsOf(reader, version.versionId)
    const rows = await repo.forTutorial(userId, version.tutorialId)
    const completed = new Set(
      rows.filter((row) => row.status === 'completed').map((row) => row.lessonKey),
    )
    const started = new Set(
      rows
        .filter((row) => row.status === 'in_progress' && row.versionId === version.versionId)
        .map((row) => row.lessonKey),
    )
    const lessons: Record<string, LessonStatus> = {}
    for (const { lessonKey } of entries) {
      if (completed.has(lessonKey)) lessons[lessonKey] = 'completed'
      else if (started.has(lessonKey)) lessons[lessonKey] = 'in_progress'
    }
    return { entries, completed, lessons }
  }

  const progressOf = async (userId: string, version: ReadableVersion): Promise<ProgressDto> => {
    const { entries, completed, lessons } = await lessonBoard({ userId }, version)
    return {
      tutorialId: version.tutorialId,
      versionId: version.versionId,
      lessons,
      completed: entries.filter((entry) => completed.has(entry.lessonKey)).length,
      total: entries.length,
      nextLessonKey: entries.find((entry) => !completed.has(entry.lessonKey))?.lessonKey ?? null,
      quizAttempts: await repo.countAttempts(userId, version.versionId),
    }
  }

  return {
    async progress(userId, input) {
      return progressOf(
        userId,
        await resolveReadableVersion(userId, input.tutorialId, input.versionId),
      )
    },

    async history(userId, input) {
      const version = await resolveReadableVersion(userId, input.tutorialId, input.versionId)
      const lessons = await tutorials.lessonsOf({ userId }, version.versionId)
      const offset = Number(input.cursor ?? 0)
      const rows = await repo.historyPage(userId, input.tutorialId, offset, input.limit + 1)
      const items = rows.slice(0, input.limit).flatMap((row) => {
        const lesson = lessons.find((entry) => entry.lessonKey === row.lessonKey)
        return lesson
          ? [
              {
                lessonKey: row.lessonKey,
                title: lesson.title,
                status: row.status,
                at: row.updatedAt.toISOString(),
              },
            ]
          : []
      })
      return { items, nextCursor: rows.length > input.limit ? String(offset + input.limit) : null }
    },

    async markLesson(userId, input) {
      const version = await tutorials.readableVersion({ userId }, input.versionId)
      const lessons = await tutorials.lessonsOf({ userId }, version.versionId)
      if (!lessons.some((lesson) => lesson.lessonKey === input.lessonKey)) notFound('Lesson')
      const now = new Date()
      await repo.upsert({
        userId,
        tutorialId: version.tutorialId,
        versionId: version.versionId,
        lessonKey: input.lessonKey,
        status: input.status,
        completedAt: input.status === 'completed' ? now : null,
        updatedAt: now,
      })
      return progressOf(userId, version)
    },

    async unmarkLesson(userId, input) {
      const version = await tutorials.readableVersion({ userId }, input.versionId)
      await repo.deleteLesson(userId, version.tutorialId, input.lessonKey)
      return progressOf(userId, version)
    },

    async submitQuiz(userId, input) {
      const version = await tutorials.readableVersion({ userId }, input.versionId)
      const lesson = version.content.chapters
        .flatMap((chapter) => chapter.lessons)
        .find((entry) => entry.key === input.lessonKey)
      if (!lesson) notFound('Lesson')
      const question = lesson.quiz?.find((entry) => entry.key === input.questionKey)
      if (!question) notFound('Question')
      if (!question.options.some((option) => option.key === input.choiceKey))
        badRequest('choice is not an option of this question')
      const correct = input.choiceKey === question.correct
      await repo.insertAttempt({
        userId,
        versionId: version.versionId,
        questionKey: question.key,
        choiceKey: input.choiceKey,
        correct,
      })
      return { correct, correctKey: question.correct, explanation: question.explanation }
    },

    async completionRatio(viewer, versionId) {
      if (viewer.userId === undefined) return null
      const reader = { userId: viewer.userId, shareToken: viewer.shareToken }
      const version = await readableOrUndefined(reader, versionId)
      if (!version) return null
      const { entries, completed } = await lessonBoard(reader, version)
      return ratioOf(
        entries.filter((entry) => completed.has(entry.lessonKey)).length,
        entries.length,
      )
    },

    async completionRatios(userId, targets) {
      const lessonKeys = await tutorials.ownedLessonKeys(
        userId,
        targets.map((target) => target.versionId),
      )
      const completed = new Map<string, Set<string>>()
      const rows = await repo.completedLessonKeys(
        userId,
        targets.map((target) => target.tutorialId),
      )
      for (const row of rows) {
        const keys = completed.get(row.tutorialId) ?? new Set<string>()
        keys.add(row.lessonKey)
        completed.set(row.tutorialId, keys)
      }
      return new Map(
        targets.map(({ tutorialId, versionId }) => {
          const keys = lessonKeys.get(versionId) ?? []
          const done = completed.get(tutorialId)
          const finished = keys.filter((key) => done?.has(key)).length
          return [versionId, ratioOf(finished, keys.length)]
        }),
      )
    },

    async resumeTarget(userId) {
      const candidates = await repo.recentInProgress(userId, RESUME_CANDIDATES)
      for (const candidate of candidates) {
        const version = await readableOrUndefined({ userId }, candidate.versionId)
        if (!version) continue
        const lesson = (await tutorials.lessonsOf({ userId }, version.versionId)).find(
          (entry) => entry.lessonKey === candidate.lessonKey,
        )
        if (!lesson) continue
        return {
          tutorialId: version.tutorialId,
          versionId: version.versionId,
          lessonKey: candidate.lessonKey,
          lessonTitle: lesson.title,
          owner: version.owner,
          repo: version.repo,
          slug: version.slug,
        }
      }
      return null
    },
  }
}
