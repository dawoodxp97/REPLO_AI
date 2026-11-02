import { and, desc, eq, gt, ilike, inArray, isNotNull, lt, sql, type SQL } from 'drizzle-orm'
import type { Visibility } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import {
  lessonIndex,
  repositories,
  repoPushEvents,
  tutorialReports,
  tutorialSourceRefs,
  tutorialVersions,
  tutorials,
} from '../../platform/db/schema'

export type TutorialRow = typeof tutorials.$inferSelect
export type TutorialVersionRow = typeof tutorialVersions.$inferSelect

export interface TutorialWithRepo {
  tutorial: TutorialRow
  owner: string
  name: string
  license: string | null
}

const withRepo = (db: DbOrTx) =>
  db
    .select({
      tutorial: tutorials,
      owner: repositories.owner,
      name: repositories.name,
      license: repositories.license,
    })
    .from(tutorials)
    .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))

const countWhere = (predicate: SQL) =>
  sql<number>`count(*) filter (where ${predicate})`.mapWith(Number)

export const tutorialsRepo = (db: DbOrTx) => {
  const patch = async (tutorialId: string, values: Partial<typeof tutorials.$inferInsert>) => {
    await db
      .update(tutorials)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(tutorials.id, tutorialId))
  }

  return {
    async findForUserRepo(userId: string, repositoryId: string): Promise<TutorialRow | undefined> {
      const [row] = await db
        .select()
        .from(tutorials)
        .where(and(eq(tutorials.userId, userId), eq(tutorials.repositoryId, repositoryId)))
        .limit(1)
      return row
    },

    async findById(tutorialId: string): Promise<TutorialWithRepo | undefined> {
      const [row] = await withRepo(db).where(eq(tutorials.id, tutorialId)).limit(1)
      return row
    },

    async findBySlug(
      owner: string,
      repo: string,
      slug: string,
    ): Promise<TutorialWithRepo | undefined> {
      const [row] = await withRepo(db)
        .where(
          and(eq(repositories.owner, owner), eq(repositories.name, repo), eq(tutorials.slug, slug)),
        )
        .limit(1)
      return row
    },

    listForUser(userId: string, limit: number, cursor?: string) {
      return db
        .select({
          tutorial: tutorials,
          owner: repositories.owner,
          name: repositories.name,
          license: repositories.license,
          versionNo: tutorialVersions.versionNo,
          audience: tutorialVersions.audience,
        })
        .from(tutorials)
        .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))
        .leftJoin(tutorialVersions, eq(tutorialVersions.id, tutorials.currentVersionId))
        .where(
          and(
            eq(tutorials.userId, userId),
            cursor === undefined ? undefined : lt(tutorials.id, cursor),
          ),
        )
        .orderBy(desc(tutorials.id))
        .limit(limit)
    },

    async insertTutorial(values: typeof tutorials.$inferInsert): Promise<TutorialRow | undefined> {
      const [row] = await db.insert(tutorials).values(values).onConflictDoNothing().returning()
      return row
    },

    async lockById(tutorialId: string): Promise<void> {
      await db
        .select({ id: tutorials.id })
        .from(tutorials)
        .where(eq(tutorials.id, tutorialId))
        .for('update')
    },

    updateVisibility(
      tutorialId: string,
      values: { visibility: Visibility; shareToken: string | null },
    ): Promise<void> {
      return patch(tutorialId, values)
    },

    touch(tutorialId: string, values: { title: string; currentVersionId: string }): Promise<void> {
      return patch(tutorialId, values)
    },

    async deleteTutorial(tutorialId: string): Promise<void> {
      await db.delete(tutorials).where(eq(tutorials.id, tutorialId))
    },

    async deleteForUserRepo(userId: string, repositoryId: string): Promise<void> {
      await db
        .delete(tutorials)
        .where(and(eq(tutorials.userId, userId), eq(tutorials.repositoryId, repositoryId)))
    },

    async releasePublicOf(userId: string): Promise<void> {
      await db
        .update(tutorials)
        .set({ userId: null })
        .where(and(eq(tutorials.userId, userId), eq(tutorials.visibility, 'public')))
    },

    async deleteAllOf(userId: string): Promise<void> {
      await db.delete(tutorials).where(eq(tutorials.userId, userId))
    },

    async latestVersionNo(tutorialId: string): Promise<number> {
      const [row] = await db
        .select({ versionNo: tutorialVersions.versionNo })
        .from(tutorialVersions)
        .where(eq(tutorialVersions.tutorialId, tutorialId))
        .orderBy(desc(tutorialVersions.versionNo))
        .limit(1)
      return row?.versionNo ?? 0
    },

    versionsOf(tutorialId: string): Promise<TutorialVersionRow[]> {
      return db
        .select()
        .from(tutorialVersions)
        .where(eq(tutorialVersions.tutorialId, tutorialId))
        .orderBy(desc(tutorialVersions.versionNo))
    },

    async findVersion(versionId: string): Promise<TutorialVersionRow | undefined> {
      const [row] = await db
        .select()
        .from(tutorialVersions)
        .where(eq(tutorialVersions.id, versionId))
        .limit(1)
      return row
    },

    async findVersionByJob(jobId: string): Promise<TutorialVersionRow | undefined> {
      const [row] = await db
        .select()
        .from(tutorialVersions)
        .where(eq(tutorialVersions.generationJobId, jobId))
        .limit(1)
      return row
    },

    async insertVersion(
      values: typeof tutorialVersions.$inferInsert,
    ): Promise<TutorialVersionRow | undefined> {
      const [row] = await db
        .insert(tutorialVersions)
        .values(values)
        .onConflictDoNothing()
        .returning()
      return row
    },

    async insertSourceRefs(values: (typeof tutorialSourceRefs.$inferInsert)[]): Promise<void> {
      if (values.length > 0) await db.insert(tutorialSourceRefs).values(values)
    },

    async sourceRefPaths(versionId: string): Promise<string[]> {
      const rows = await db
        .selectDistinct({ path: tutorialSourceRefs.path })
        .from(tutorialSourceRefs)
        .where(eq(tutorialSourceRefs.versionId, versionId))
      return rows.map((row) => row.path)
    },

    async insertLessons(values: (typeof lessonIndex.$inferInsert)[]): Promise<void> {
      if (values.length > 0) await db.insert(lessonIndex).values(values)
    },

    lessonKeysOf(userId: string, versionIds: readonly string[]) {
      if (versionIds.length === 0) return []
      return db
        .select({ versionId: lessonIndex.versionId, lessonKey: lessonIndex.lessonKey })
        .from(lessonIndex)
        .innerJoin(tutorialVersions, eq(tutorialVersions.id, lessonIndex.versionId))
        .innerJoin(tutorials, eq(tutorials.id, tutorialVersions.tutorialId))
        .where(and(eq(tutorials.userId, userId), inArray(lessonIndex.versionId, [...versionIds])))
    },

    lessonsOf(versionId: string) {
      return db
        .select()
        .from(lessonIndex)
        .where(eq(lessonIndex.versionId, versionId))
        .orderBy(lessonIndex.position)
    },

    async isStale(input: {
      repositoryId: string
      snapshotCreatedAt: Date
      paths: readonly string[]
    }): Promise<boolean> {
      if (input.paths.length === 0) return false
      const pathArray = sql`ARRAY[${sql.join(
        input.paths.map((path) => sql`${path}`),
        sql`, `,
      )}]::text[]`
      const [row] = await db
        .select({ hit: sql<number>`1` })
        .from(repoPushEvents)
        .where(
          and(
            eq(repoPushEvents.repositoryId, input.repositoryId),
            gt(repoPushEvents.pushedAt, input.snapshotCreatedAt),
            sql`${repoPushEvents.paths} && ${pathArray}`,
          ),
        )
        .limit(1)
      return row !== undefined
    },

    async recordPush(input: {
      repositoryId: string
      commitSha: string
      paths: string[]
      pushedAt: Date
    }): Promise<void> {
      await db.insert(repoPushEvents).values(input)
    },

    async insertReport(values: {
      tutorialId: string
      reporterId: string
      reason: string
    }): Promise<void> {
      await db
        .insert(tutorialReports)
        .values(values)
        .onConflictDoNothing({ target: [tutorialReports.tutorialId, tutorialReports.reporterId] })
    },

    async countsFor(userId: string) {
      const [row] = await db
        .select({
          total: countWhere(sql`true`),
          draft: countWhere(sql`${tutorialVersions.status} = 'draft'`),
          private: countWhere(sql`${tutorials.visibility} = 'private'`),
          link: countWhere(sql`${tutorials.visibility} = 'link'`),
          public: countWhere(sql`${tutorials.visibility} = 'public'`),
        })
        .from(tutorials)
        .leftJoin(tutorialVersions, eq(tutorialVersions.id, tutorials.currentVersionId))
        .where(eq(tutorials.userId, userId))
      return row ?? { total: 0, draft: 0, private: 0, link: 0, public: 0 }
    },

    searchTutorials(userId: string, pattern: string, limit: number) {
      return withRepo(db)
        .where(and(eq(tutorials.userId, userId), ilike(tutorials.title, pattern)))
        .orderBy(desc(tutorials.updatedAt))
        .limit(limit)
    },

    searchLessons(userId: string, pattern: string, limit: number) {
      return db
        .select({
          tutorialId: tutorials.id,
          tutorialTitle: tutorials.title,
          owner: repositories.owner,
          repo: repositories.name,
          slug: tutorials.slug,
          versionId: lessonIndex.versionId,
          chapterKey: lessonIndex.chapterKey,
          lessonKey: lessonIndex.lessonKey,
          title: lessonIndex.title,
        })
        .from(lessonIndex)
        .innerJoin(tutorials, eq(tutorials.currentVersionId, lessonIndex.versionId))
        .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))
        .where(and(eq(tutorials.userId, userId), ilike(lessonIndex.title, pattern)))
        .orderBy(lessonIndex.title)
        .limit(limit)
    },

    recentPublishedFor(userId: string, zone: string, limit: number, offset: number) {
      return db
        .select({
          versionId: tutorialVersions.id,
          publishedAt: tutorialVersions.publishedAt,
          localDate: sql<string>`to_char(${tutorialVersions.publishedAt} AT TIME ZONE ${zone}, 'YYYY-MM-DD')`,
          title: tutorials.title,
          owner: repositories.owner,
          name: repositories.name,
          slug: tutorials.slug,
        })
        .from(tutorialVersions)
        .innerJoin(tutorials, eq(tutorials.id, tutorialVersions.tutorialId))
        .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))
        .where(
          and(
            eq(tutorials.userId, userId),
            isNotNull(tutorialVersions.publishedAt),
            eq(tutorialVersions.status, 'published'),
          ),
        )
        .orderBy(desc(tutorialVersions.publishedAt), desc(tutorialVersions.id))
        .limit(limit)
        .offset(offset)
    },
  }
}
