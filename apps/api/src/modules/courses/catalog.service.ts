import type {
  ActivityItem,
  DashboardSummary,
  SearchResults,
  CourseListInput,
  CoursePage,
  CourseSummaryDto,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { containsPattern } from '../../platform/db/query-helpers'
import { requireFound } from '../../platform/errors'
import type { LearningService } from '../learning/learning.service'
import { coursePath } from './access'
import { toCourseSummary } from './course-summary'
import { coursesRepo } from './courses.repo'

export type CourseCounts = Pick<DashboardSummary['counts'], 'total' | 'draft'>

export interface CourseCatalogDeps {
  db: Db
  learning: Pick<LearningService, 'completionRatio' | 'completionRatios'>
}

export interface CourseCatalog {
  list(userId: string, input: CourseListInput): Promise<CoursePage>
  summary(userId: string, courseId: string): Promise<CourseSummaryDto>
  counts(userId: string): Promise<CourseCounts>
  recentPublished(
    userId: string,
    input: { zone: string; limit: number; offset: number },
  ): Promise<ActivityItem[]>
  searchOwn(
    userId: string,
    query: string,
    limit: number,
  ): Promise<Pick<SearchResults, 'courses' | 'lessons'>>
  searchFiles(userId: string, query: string, limit: number): Promise<SearchResults['files']>
}

export function createCourseCatalog(deps: CourseCatalogDeps): CourseCatalog {
  const { db, learning } = deps
  const repo = coursesRepo(db)

  return {
    async list(userId, input) {
      const rows = await repo.listForUser(userId, input.limit + 1, input.cursor)
      const page = rows.slice(0, input.limit)
      const ratios = await learning.completionRatios(
        userId,
        page.flatMap((row) =>
          row.course.currentVersionId
            ? [{ courseId: row.course.id, versionId: row.course.currentVersionId }]
            : [],
        ),
      )
      const items = page.map((row) =>
        toCourseSummary(
          row,
          row.versionNo === null || row.audience === null
            ? undefined
            : { versionNo: row.versionNo, audience: row.audience },
          row.course.currentVersionId ? (ratios.get(row.course.currentVersionId) ?? null) : null,
        ),
      )
      const last = page.at(-1)
      return {
        items,
        nextCursor: rows.length > input.limit ? (last?.course.id ?? null) : null,
      }
    },

    async summary(userId, courseId) {
      const row = requireFound(await repo.findById(courseId), 'Course')
      const versionId = row.course.currentVersionId
      const current = versionId ? (await repo.findVersionHead(versionId))?.version : undefined
      const progress = versionId ? await learning.completionRatio({ userId }, versionId) : null
      return toCourseSummary(row, current, progress)
    },

    counts: (userId) => repo.countsFor(userId),

    async recentPublished(userId, input) {
      const rows = await repo.recentPublishedFor(userId, input.zone, input.limit, input.offset)
      return rows.map((row) => ({
        id: row.versionId,
        kind: 'course_published',
        title: `${row.title} published`,
        localDate: row.localDate,
        at: row.publishedAt.toISOString(),
        link: coursePath(row.owner, row.name, row.slug),
      }))
    },

    async searchOwn(userId, query, limit) {
      const pattern = containsPattern(query)
      const courseRows = await repo.searchCourses(userId, pattern, limit)
      const lessonRows = await repo.searchLessons(userId, pattern, limit)
      return {
        courses: courseRows.map((row) => ({
          courseId: row.course.id,
          title: row.course.title,
          owner: row.owner,
          repo: row.name,
          slug: row.course.slug,
        })),
        lessons: lessonRows,
      }
    },

    async searchFiles(userId, query, limit) {
      const rows = await repo.searchFiles(userId, containsPattern(query), limit)
      return rows.map((row) => ({
        courseId: row.courseId,
        versionId: row.versionId,
        owner: row.owner,
        repo: row.repo,
        slug: row.slug,
        path: row.path,
      }))
    },
  }
}
