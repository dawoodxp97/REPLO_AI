import { and, desc, eq, ilike, inArray, lt, sql, type SQL } from 'drizzle-orm'
import type { DiagramSpec } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import {
  courseLessons,
  repositories,
  courseSourceRefs,
  courseVersions,
  courses,
  diagramSpecs,
  repositorySnapshots,
  snapshotFiles,
} from '../../platform/db/schema'

export type CourseRow = typeof courses.$inferSelect
export type CourseVersionRow = typeof courseVersions.$inferSelect

export interface CourseWithRepo {
  course: CourseRow
  owner: string
  name: string
}

export interface VersionHead extends CourseWithRepo {
  version: Pick<CourseVersionRow, 'id' | 'snapshotId' | 'versionNo' | 'audience'>
}

const withRepo = (db: DbOrTx) =>
  db
    .select({
      course: courses,
      owner: repositories.owner,
      name: repositories.name,
    })
    .from(courses)
    .innerJoin(repositories, eq(repositories.id, courses.repositoryId))

const countWhere = (predicate: SQL) =>
  sql<number>`count(*) filter (where ${predicate})`.mapWith(Number)

export const coursesRepo = (db: DbOrTx) => {
  const patch = async (courseId: string, values: Partial<typeof courses.$inferInsert>) => {
    await db
      .update(courses)
      .set({ ...values, updatedAt: sql`now()` })
      .where(eq(courses.id, courseId))
  }

  return {
    async findForUserRepo(userId: string, repositoryId: string): Promise<CourseRow | undefined> {
      const [row] = await db
        .select()
        .from(courses)
        .where(and(eq(courses.userId, userId), eq(courses.repositoryId, repositoryId)))
        .limit(1)
      return row
    },

    async findById(courseId: string): Promise<CourseWithRepo | undefined> {
      const [row] = await withRepo(db).where(eq(courses.id, courseId)).limit(1)
      return row
    },

    async findBySlug(
      owner: string,
      repo: string,
      slug: string,
    ): Promise<CourseWithRepo | undefined> {
      const [row] = await withRepo(db)
        .where(
          and(eq(repositories.owner, owner), eq(repositories.name, repo), eq(courses.slug, slug)),
        )
        .limit(1)
      return row
    },

    listForUser(userId: string, limit: number, cursor?: string) {
      return db
        .select({
          course: courses,
          owner: repositories.owner,
          name: repositories.name,
          versionNo: courseVersions.versionNo,
          audience: courseVersions.audience,
        })
        .from(courses)
        .innerJoin(repositories, eq(repositories.id, courses.repositoryId))
        .leftJoin(courseVersions, eq(courseVersions.id, courses.currentVersionId))
        .where(
          and(
            eq(courses.userId, userId),
            cursor === undefined ? undefined : lt(courses.id, cursor),
          ),
        )
        .orderBy(desc(courses.id))
        .limit(limit)
    },

    async insertCourse(values: typeof courses.$inferInsert): Promise<CourseRow | undefined> {
      const [row] = await db.insert(courses).values(values).onConflictDoNothing().returning()
      return row
    },

    async lockById(courseId: string): Promise<void> {
      await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.id, courseId))
        .for('update')
    },

    touch(courseId: string, values: { title: string; currentVersionId: string }): Promise<void> {
      return patch(courseId, values)
    },

    async deleteCourse(courseId: string): Promise<void> {
      await db.delete(courses).where(eq(courses.id, courseId))
    },

    async deleteForUserRepo(userId: string, repositoryId: string): Promise<void> {
      await db
        .delete(courses)
        .where(and(eq(courses.userId, userId), eq(courses.repositoryId, repositoryId)))
    },

    async deleteAllOf(userId: string): Promise<void> {
      await db.delete(courses).where(eq(courses.userId, userId))
    },

    async latestVersionNo(courseId: string): Promise<number> {
      const [row] = await db
        .select({ versionNo: courseVersions.versionNo })
        .from(courseVersions)
        .where(eq(courseVersions.courseId, courseId))
        .orderBy(desc(courseVersions.versionNo))
        .limit(1)
      return row?.versionNo ?? 0
    },

    versionHeadsOf(courseId: string) {
      return db
        .select({
          id: courseVersions.id,
          versionNo: courseVersions.versionNo,
          publishedAt: courseVersions.publishedAt,
          status: courseVersions.status,
          snapshotId: courseVersions.snapshotId,
          audience: courseVersions.audience,
        })
        .from(courseVersions)
        .where(eq(courseVersions.courseId, courseId))
        .orderBy(desc(courseVersions.versionNo))
    },

    async findVersionHead(versionId: string): Promise<VersionHead | undefined> {
      const [row] = await db
        .select({
          course: courses,
          owner: repositories.owner,
          name: repositories.name,
          version: {
            id: courseVersions.id,
            snapshotId: courseVersions.snapshotId,
            versionNo: courseVersions.versionNo,
            audience: courseVersions.audience,
          },
        })
        .from(courseVersions)
        .innerJoin(courses, eq(courses.id, courseVersions.courseId))
        .innerJoin(repositories, eq(repositories.id, courses.repositoryId))
        .where(eq(courseVersions.id, versionId))
        .limit(1)
      return row
    },

    async findVersion(versionId: string): Promise<CourseVersionRow | undefined> {
      const [row] = await db
        .select()
        .from(courseVersions)
        .where(eq(courseVersions.id, versionId))
        .limit(1)
      return row
    },

    async findVersionByJob(jobId: string): Promise<CourseVersionRow | undefined> {
      const [row] = await db
        .select()
        .from(courseVersions)
        .where(eq(courseVersions.generationJobId, jobId))
        .limit(1)
      return row
    },

    async insertVersion(
      values: typeof courseVersions.$inferInsert,
    ): Promise<CourseVersionRow | undefined> {
      const [row] = await db.insert(courseVersions).values(values).onConflictDoNothing().returning()
      return row
    },

    async insertSourceRefs(values: (typeof courseSourceRefs.$inferInsert)[]): Promise<void> {
      if (values.length > 0) await db.insert(courseSourceRefs).values(values)
    },

    async citedPathsOf(versionId: string): Promise<ReadonlySet<string>> {
      const rows = await db
        .selectDistinct({ path: courseSourceRefs.path })
        .from(courseSourceRefs)
        .where(eq(courseSourceRefs.versionId, versionId))
      return new Set(rows.map((row) => row.path))
    },

    async insertLessons(values: (typeof courseLessons.$inferInsert)[]): Promise<void> {
      if (values.length > 0) await db.insert(courseLessons).values(values)
    },

    async insertDiagrams(versionId: string, diagrams: readonly DiagramSpec[]): Promise<void> {
      if (diagrams.length === 0) return
      await db.insert(diagramSpecs).values(
        diagrams.map((diagram) => ({
          versionId,
          diagramId: diagram.id,
          type: diagram.type,
          spec: diagram,
          validation: { valid: true, issues: [] },
        })),
      )
    },

    lessonKeysOf(userId: string, versionIds: readonly string[]) {
      if (versionIds.length === 0) return []
      return db
        .select({ versionId: courseLessons.versionId, lessonKey: courseLessons.lessonKey })
        .from(courseLessons)
        .innerJoin(courseVersions, eq(courseVersions.id, courseLessons.versionId))
        .innerJoin(courses, eq(courses.id, courseVersions.courseId))
        .where(and(eq(courses.userId, userId), inArray(courseLessons.versionId, [...versionIds])))
    },

    lessonsOf(versionId: string) {
      return db
        .select()
        .from(courseLessons)
        .where(eq(courseLessons.versionId, versionId))
        .orderBy(courseLessons.position)
    },

    async countsFor(userId: string) {
      const [row] = await db
        .select({
          total: countWhere(sql`true`),
          draft: countWhere(sql`${courseVersions.status} = 'draft'`),
        })
        .from(courses)
        .leftJoin(courseVersions, eq(courseVersions.id, courses.currentVersionId))
        .where(eq(courses.userId, userId))
      return row ?? { total: 0, draft: 0 }
    },

    searchCourses(userId: string, pattern: string, limit: number) {
      return withRepo(db)
        .where(and(eq(courses.userId, userId), ilike(courses.title, pattern)))
        .orderBy(desc(courses.updatedAt))
        .limit(limit)
    },

    searchLessons(userId: string, pattern: string, limit: number) {
      return db
        .select({
          courseId: courses.id,
          courseTitle: courses.title,
          owner: repositories.owner,
          repo: repositories.name,
          slug: courses.slug,
          versionId: courseLessons.versionId,
          chapterKey: courseLessons.chapterKey,
          lessonKey: courseLessons.lessonKey,
          title: courseLessons.title,
        })
        .from(courseLessons)
        .innerJoin(courses, eq(courses.currentVersionId, courseLessons.versionId))
        .innerJoin(repositories, eq(repositories.id, courses.repositoryId))
        .where(and(eq(courses.userId, userId), ilike(courseLessons.title, pattern)))
        .orderBy(courseLessons.title)
        .limit(limit)
    },

    searchFiles(userId: string, pattern: string, limit: number) {
      return db
        .select({
          courseId: courses.id,
          versionId: courseVersions.id,
          owner: repositories.owner,
          repo: repositories.name,
          path: snapshotFiles.path,
        })
        .from(courses)
        .innerJoin(courseVersions, eq(courseVersions.courseId, courses.id))
        .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, courseVersions.snapshotId))
        .innerJoin(snapshotFiles, eq(snapshotFiles.snapshotId, repositorySnapshots.id))
        .innerJoin(repositories, eq(repositories.id, courses.repositoryId))
        .where(and(eq(courses.userId, userId), ilike(snapshotFiles.path, pattern)))
        .orderBy(snapshotFiles.path)
        .limit(limit)
    },

    recentPublishedFor(userId: string, zone: string, limit: number, offset: number) {
      return db
        .select({
          versionId: courseVersions.id,
          publishedAt: courseVersions.publishedAt,
          localDate: sql<string>`to_char(${courseVersions.publishedAt} AT TIME ZONE ${zone}, 'YYYY-MM-DD')`,
          title: courses.title,
          owner: repositories.owner,
          name: repositories.name,
          slug: courses.slug,
        })
        .from(courseVersions)
        .innerJoin(courses, eq(courses.id, courseVersions.courseId))
        .innerJoin(repositories, eq(repositories.id, courses.repositoryId))
        .where(and(eq(courses.userId, userId), eq(courseVersions.status, 'published')))
        .orderBy(desc(courseVersions.publishedAt), desc(courseVersions.id))
        .limit(limit)
        .offset(offset)
    },
  }
}
