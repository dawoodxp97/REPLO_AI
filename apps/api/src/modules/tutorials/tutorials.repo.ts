import { and, desc, eq, gt, ilike, inArray, lt, notExists, sql, type SQL } from 'drizzle-orm'
import type { Visibility } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import {
  tutorialLessons,
  repositories,
  repositoryPushEvents,
  repositorySnapshots,
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

export interface VersionHead extends TutorialWithRepo {
  version: Pick<TutorialVersionRow, 'id' | 'snapshotId' | 'versionNo' | 'audience'>
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

    versionHeadsOf(tutorialId: string) {
      return db
        .select({
          id: tutorialVersions.id,
          versionNo: tutorialVersions.versionNo,
          publishedAt: tutorialVersions.publishedAt,
          status: tutorialVersions.status,
          snapshotId: tutorialVersions.snapshotId,
          audience: tutorialVersions.audience,
        })
        .from(tutorialVersions)
        .where(eq(tutorialVersions.tutorialId, tutorialId))
        .orderBy(desc(tutorialVersions.versionNo))
    },

    async findVersionHead(versionId: string): Promise<VersionHead | undefined> {
      const [row] = await db
        .select({
          tutorial: tutorials,
          owner: repositories.owner,
          name: repositories.name,
          license: repositories.license,
          version: {
            id: tutorialVersions.id,
            snapshotId: tutorialVersions.snapshotId,
            versionNo: tutorialVersions.versionNo,
            audience: tutorialVersions.audience,
          },
        })
        .from(tutorialVersions)
        .innerJoin(tutorials, eq(tutorials.id, tutorialVersions.tutorialId))
        .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))
        .where(eq(tutorialVersions.id, versionId))
        .limit(1)
      return row
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

    async citedPathsOf(versionId: string): Promise<ReadonlySet<string>> {
      const rows = await db
        .selectDistinct({ path: tutorialSourceRefs.path })
        .from(tutorialSourceRefs)
        .where(eq(tutorialSourceRefs.versionId, versionId))
      return new Set(rows.map((row) => row.path))
    },

    async insertLessons(values: (typeof tutorialLessons.$inferInsert)[]): Promise<void> {
      if (values.length > 0) await db.insert(tutorialLessons).values(values)
    },

    lessonKeysOf(userId: string, versionIds: readonly string[]) {
      if (versionIds.length === 0) return []
      return db
        .select({ versionId: tutorialLessons.versionId, lessonKey: tutorialLessons.lessonKey })
        .from(tutorialLessons)
        .innerJoin(tutorialVersions, eq(tutorialVersions.id, tutorialLessons.versionId))
        .innerJoin(tutorials, eq(tutorials.id, tutorialVersions.tutorialId))
        .where(and(eq(tutorials.userId, userId), inArray(tutorialLessons.versionId, [...versionIds])))
    },

    lessonsOf(versionId: string) {
      return db
        .select()
        .from(tutorialLessons)
        .where(eq(tutorialLessons.versionId, versionId))
        .orderBy(tutorialLessons.position)
    },

    async isStale(input: {
      versionId: string
      repositoryId: string
      snapshotCreatedAt: Date
    }): Promise<boolean> {
      const [row] = await db
        .select({ hit: sql<number>`1` })
        .from(repositoryPushEvents)
        .where(
          and(
            eq(repositoryPushEvents.repositoryId, input.repositoryId),
            gt(repositoryPushEvents.pushedAt, input.snapshotCreatedAt),
            sql`${repositoryPushEvents.paths} && (select array_agg(distinct ${tutorialSourceRefs.path}) from ${tutorialSourceRefs} where ${tutorialSourceRefs.versionId} = ${input.versionId})`,
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
      await db.insert(repositoryPushEvents).values(input)
    },

    async deleteObsoletePushEvents(): Promise<number> {
      const deleted = await db
        .delete(repositoryPushEvents)
        .where(
          notExists(
            db
              .select({ one: sql`1` })
              .from(repositorySnapshots)
              .where(
                and(
                  eq(repositorySnapshots.repositoryId, repositoryPushEvents.repositoryId),
                  lt(repositorySnapshots.createdAt, repositoryPushEvents.pushedAt),
                ),
              ),
          ),
        )
        .returning({ id: repositoryPushEvents.id })
      return deleted.length
    },

    async insertReport(values: {
      tutorialId: string
      reporterUserId: string
      reason: string
    }): Promise<void> {
      await db
        .insert(tutorialReports)
        .values(values)
        .onConflictDoNothing({ target: [tutorialReports.tutorialId, tutorialReports.reporterUserId] })
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
          versionId: tutorialLessons.versionId,
          chapterKey: tutorialLessons.chapterKey,
          lessonKey: tutorialLessons.lessonKey,
          title: tutorialLessons.title,
        })
        .from(tutorialLessons)
        .innerJoin(tutorials, eq(tutorials.currentVersionId, tutorialLessons.versionId))
        .innerJoin(repositories, eq(repositories.id, tutorials.repositoryId))
        .where(and(eq(tutorials.userId, userId), ilike(tutorialLessons.title, pattern)))
        .orderBy(tutorialLessons.title)
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
            eq(tutorialVersions.status, 'published'),
          ),
        )
        .orderBy(desc(tutorialVersions.publishedAt), desc(tutorialVersions.id))
        .limit(limit)
        .offset(offset)
    },
  }
}
