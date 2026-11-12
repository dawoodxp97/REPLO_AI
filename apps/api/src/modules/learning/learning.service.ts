import type {
  DashboardSummary,
  HistoryPage,
  LessonStatus,
  ProgressDto,
  QuizResultDto,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { decodeOffset, offsetPage } from '../../platform/pagination'
import { daysAgo } from '../../platform/time'
import type { Viewer } from '../tutorials/access'
import type { ReadableHead, VersionAccess } from '../tutorials/version-access.service'
import { gradeAnswer } from './learning.quiz'
import { learningRepo } from './learning.repo'

interface LearningDeps {
  db: Db
  tutorials: VersionAccess
}

export type ResumeTarget = NonNullable<DashboardSummary['resume']>
export type ReadingStats = DashboardSummary['reading']

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
  readingStats(userId: string, now?: Date): Promise<ReadingStats>
}

const RESUME_CANDIDATES = 20
const RECENT_READING_DAYS = 7

export function createLearningService(deps: LearningDeps): LearningService {
  const { db, tutorials } = deps
  const repo = learningRepo(db)

  const resolveVersion = async (userId: string, versionId: string) => {
    const version = await tutorials.findReadableHead({ userId }, versionId)
    if (!version) return undefined
    return { version, lessons: await tutorials.lessonsOfVersion(version.versionId) }
  }

  const resolveReadableVersion = async (
    userId: string,
    tutorialId: string,
    versionId: string | undefined,
  ) => {
    const version = await tutorials.readableHead(
      { userId },
      versionId ?? (await tutorials.currentVersionOf({ userId }, tutorialId)),
    )
    if (version.tutorialId !== tutorialId) notFound('Tutorial version')
    return version
  }

  const lessonBoard = async (
    userId: string,
    version: ReadableHead,
    entries: readonly { lessonKey: string }[],
  ) => {
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
    return { completed, lessons }
  }

  const progressOf = async (
    userId: string,
    version: ReadableHead,
    entries: readonly { lessonKey: string }[],
  ): Promise<ProgressDto> => {
    const [{ completed, lessons }, quizAttempts] = await Promise.all([
      lessonBoard(userId, version, entries),
      repo.countAttempts(userId, version.versionId),
    ])
    return {
      tutorialId: version.tutorialId,
      versionId: version.versionId,
      lessons,
      completed: countCompleted(
        entries.map((entry) => entry.lessonKey),
        completed,
      ),
      total: entries.length,
      nextLessonKey: entries.find((entry) => !completed.has(entry.lessonKey))?.lessonKey ?? null,
      quizAttempts,
    }
  }

  const progressFor = async (userId: string, version: ReadableHead) =>
    progressOf(userId, version, await tutorials.lessonsOfVersion(version.versionId))

  return {
    async progress(userId, input) {
      return progressFor(
        userId,
        await resolveReadableVersion(userId, input.tutorialId, input.versionId),
      )
    },

    async history(userId, input) {
      const version = await resolveReadableVersion(userId, input.tutorialId, input.versionId)
      const lessons = new Map(
        (await tutorials.lessonsOfVersion(version.versionId)).map((lesson) => [
          lesson.lessonKey,
          lesson,
        ]),
      )
      const offset = decodeOffset(input.cursor)
      const rows = await repo.historyPage(
        userId,
        input.tutorialId,
        [...lessons.keys()],
        offset,
        input.limit + 1,
      )
      const page = offsetPage(rows, offset, input.limit)
      const items = page.items.flatMap((row) => {
        const lesson = lessons.get(row.lessonKey)
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
      return { items, nextCursor: page.nextCursor }
    },

    async markLesson(userId, input) {
      const version = await tutorials.readableHead({ userId }, input.versionId)
      const lessons = await tutorials.lessonsOfVersion(version.versionId)
      if (!lessons.some((lesson) => lesson.lessonKey === input.lessonKey)) notFound('Lesson')
      if (input.status === 'in_progress') {
        const completed = await repo.completedLessonKeys(userId, [version.tutorialId])
        if (completed.some((row) => row.lessonKey === input.lessonKey))
          return progressOf(userId, version, lessons)
      }
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
      return progressOf(userId, version, lessons)
    },

    async unmarkLesson(userId, input) {
      const version = await tutorials.readableHead({ userId }, input.versionId)
      await repo.deleteLesson(userId, version.tutorialId, input.lessonKey)
      return progressFor(userId, version)
    },

    async submitQuiz(userId, input) {
      const version = await tutorials.readableVersion({ userId }, input.versionId)
      const graded = gradeAnswer(version.content, input)
      await repo.insertAttempt({
        userId,
        versionId: version.versionId,
        questionKey: graded.questionKey,
        choiceKey: graded.choiceKey,
        correct: graded.result.correct,
      })
      return graded.result
    },

    async completionRatio(viewer, versionId) {
      if (viewer.userId === undefined) return null
      const version = await tutorials.findReadableHead(
        { userId: viewer.userId, shareToken: viewer.shareToken },
        versionId,
      )
      if (!version) return null
      const entries = await tutorials.lessonsOfVersion(version.versionId)
      const { completed } = await lessonBoard(viewer.userId, version, entries)
      return ratioOf(
        countCompleted(
          entries.map((entry) => entry.lessonKey),
          completed,
        ),
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
          return [versionId, ratioOf(countCompleted(keys, completed.get(tutorialId)), keys.length)]
        }),
      )
    },

    async resumeTarget(userId) {
      const candidates = await repo.recentInProgress(userId, RESUME_CANDIDATES)
      if (candidates.length === 0) return null
      const resolved = new Map(
        await Promise.all(
          [...new Set(candidates.map((candidate) => candidate.versionId))].map(
            async (versionId) => [versionId, await resolveVersion(userId, versionId)] as const,
          ),
        ),
      )
      for (const candidate of candidates) {
        const entry = resolved.get(candidate.versionId)
        const lesson = entry?.lessons.find((item) => item.lessonKey === candidate.lessonKey)
        if (!entry || !lesson) continue
        const { version } = entry
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

    async readingStats(userId, now = new Date()) {
      const totals = await repo.readingTotals(userId, daysAgo(now, RECENT_READING_DAYS))
      return {
        lessonsCompleted: totals.lessonsCompleted,
        lessonsCompletedLast7Days: totals.lessonsCompletedSince,
        quizAnswers: totals.quizAnswers,
        quizAnswersCorrect: totals.quizAnswersCorrect,
      }
    },
  }
}

export function ratioOf(done: number, total: number): number | null {
  return total === 0 ? null : done / total
}

export function countCompleted(
  lessonKeys: readonly string[],
  completed: ReadonlySet<string> | undefined,
): number {
  if (!completed) return 0
  let count = 0
  for (const key of lessonKeys) if (completed.has(key)) count += 1
  return count
}
