import type {
  ActivityItem,
  DashboardSummary,
  SearchResults,
  TutorialListInput,
  TutorialPage,
  TutorialSummaryDto,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { containsPattern } from '../../platform/db/like'
import { requireFound } from '../../platform/errors'
import type { LearningService } from '../learning/learning.service'
import { tutorialPath } from './access'
import { toTutorialSummary } from './tutorial-summary'
import { tutorialsRepo } from './tutorials.repo'

export type TutorialCounts = DashboardSummary['counts']

export interface TutorialCatalogDeps {
  db: Db
  learning: Pick<LearningService, 'completionRatio' | 'completionRatios'>
}

export interface TutorialCatalog {
  list(userId: string, input: TutorialListInput): Promise<TutorialPage>
  summary(userId: string, tutorialId: string): Promise<TutorialSummaryDto>
  counts(userId: string): Promise<TutorialCounts>
  recentPublished(
    userId: string,
    input: { zone: string; limit: number; offset: number },
  ): Promise<ActivityItem[]>
  searchOwn(
    userId: string,
    query: string,
    limit: number,
  ): Promise<Pick<SearchResults, 'tutorials' | 'lessons'>>
}

export function createTutorialCatalog(deps: TutorialCatalogDeps): TutorialCatalog {
  const { db, learning } = deps
  const repo = tutorialsRepo(db)

  return {
    async list(userId, input) {
      const rows = await repo.listForUser(userId, input.limit + 1, input.cursor)
      const page = rows.slice(0, input.limit)
      const ratios = await learning.completionRatios(
        userId,
        page.flatMap((row) =>
          row.tutorial.currentVersionId
            ? [{ tutorialId: row.tutorial.id, versionId: row.tutorial.currentVersionId }]
            : [],
        ),
      )
      const items = page.map((row) =>
        toTutorialSummary(
          row,
          row.versionNo === null || row.audience === null
            ? undefined
            : { versionNo: row.versionNo, audience: row.audience },
          row.tutorial.currentVersionId
            ? (ratios.get(row.tutorial.currentVersionId) ?? null)
            : null,
        ),
      )
      const last = page.at(-1)
      return {
        items,
        nextCursor: rows.length > input.limit ? (last?.tutorial.id ?? null) : null,
      }
    },

    async summary(userId, tutorialId) {
      const row = requireFound(await repo.findById(tutorialId), 'Tutorial')
      const versionId = row.tutorial.currentVersionId
      const current = versionId ? (await repo.findVersionHead(versionId))?.version : undefined
      const progress = versionId ? await learning.completionRatio({ userId }, versionId) : null
      return toTutorialSummary(row, current, progress)
    },

    counts: (userId) => repo.countsFor(userId),

    async recentPublished(userId, input) {
      const rows = await repo.recentPublishedFor(userId, input.zone, input.limit, input.offset)
      return rows.map((row) => ({
        id: row.versionId,
        kind: 'tutorial_published',
        title: `${row.title} published`,
        localDate: row.localDate,
        at: row.publishedAt.toISOString(),
        link: tutorialPath(row.owner, row.name, row.slug),
      }))
    },

    async searchOwn(userId, query, limit) {
      const pattern = containsPattern(query)
      const tutorialRows = await repo.searchTutorials(userId, pattern, limit)
      const lessonRows = await repo.searchLessons(userId, pattern, limit)
      return {
        tutorials: tutorialRows.map((row) => ({
          tutorialId: row.tutorial.id,
          title: row.tutorial.title,
          owner: row.owner,
          repo: row.name,
          slug: row.tutorial.slug,
        })),
        lessons: lessonRows,
      }
    },
  }
}
