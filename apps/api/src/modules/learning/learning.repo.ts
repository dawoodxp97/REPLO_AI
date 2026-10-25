import { and, asc, count, desc, eq, inArray } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { learningProgress, quizAttempts } from '../../platform/db/schema'

export const learningRepo = (db: DbOrTx) => ({
  forTutorial(userId: string, tutorialId: string) {
    return db
      .select()
      .from(learningProgress)
      .where(and(eq(learningProgress.userId, userId), eq(learningProgress.tutorialId, tutorialId)))
  },

  async completedLessonKeys(userId: string, tutorialIds: readonly string[]) {
    if (tutorialIds.length === 0) return []
    return db
      .select({ tutorialId: learningProgress.tutorialId, lessonKey: learningProgress.lessonKey })
      .from(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.status, 'completed'),
          inArray(learningProgress.tutorialId, [...tutorialIds]),
        ),
      )
  },

  historyPage(userId: string, tutorialId: string, offset: number, limit: number) {
    const latest = db.$with('latest').as(
      db
        .selectDistinctOn([learningProgress.lessonKey], {
          lessonKey: learningProgress.lessonKey,
          status: learningProgress.status,
          updatedAt: learningProgress.updatedAt,
        })
        .from(learningProgress)
        .where(
          and(eq(learningProgress.userId, userId), eq(learningProgress.tutorialId, tutorialId)),
        )
        .orderBy(asc(learningProgress.lessonKey), desc(learningProgress.updatedAt)),
    )
    return db
      .with(latest)
      .select()
      .from(latest)
      .orderBy(desc(latest.updatedAt), asc(latest.lessonKey))
      .limit(limit)
      .offset(offset)
  },

  recentInProgress(userId: string, limit: number) {
    return db
      .select()
      .from(learningProgress)
      .where(and(eq(learningProgress.userId, userId), eq(learningProgress.status, 'in_progress')))
      .orderBy(desc(learningProgress.updatedAt))
      .limit(limit)
  },

  async upsert(row: typeof learningProgress.$inferInsert) {
    await db
      .insert(learningProgress)
      .values(row)
      .onConflictDoUpdate({
        target: [learningProgress.userId, learningProgress.versionId, learningProgress.lessonKey],
        set: {
          tutorialId: row.tutorialId,
          status: row.status,
          completedAt: row.completedAt,
          updatedAt: row.updatedAt,
        },
      })
  },

  async deleteLesson(userId: string, tutorialId: string, lessonKey: string) {
    await db
      .delete(learningProgress)
      .where(
        and(
          eq(learningProgress.userId, userId),
          eq(learningProgress.tutorialId, tutorialId),
          eq(learningProgress.lessonKey, lessonKey),
        ),
      )
  },

  async countAttempts(userId: string, versionId: string): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.versionId, versionId)))
    return row?.total ?? 0
  },

  async insertAttempt(attempt: typeof quizAttempts.$inferInsert) {
    await db.insert(quizAttempts).values(attempt)
  },
})
