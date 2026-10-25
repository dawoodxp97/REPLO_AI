import {
  TutorialContent,
  ValidationReport,
  type ActivityItem,
  type Audience,
  type Chapter,
  type ChapterDto,
  type DashboardSummary,
  type LearnerChapter,
  type LearnerQuestion,
  type Question,
  type SearchResults,
  type SourceFileDto,
  type SourceTreeDto,
  type TutorialListInput,
  type TutorialOverviewDto,
  type TutorialPage,
  type TutorialSummaryDto,
  type Visibility,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { containsPattern } from '../../platform/db/like'
import { notFound } from '../../platform/errors'
import type { IndexingService } from '../indexing/indexing.service'
import type { LearningService } from '../learning/learning.service'
import { canRead, ownershipOf, tutorialPath, type Viewer } from './access'
import { lessonRefIds } from './lesson-content'
import { toSourceTree } from './source-tree'
import type { TutorialReader } from './reader.service'
import { tutorialsRepo, type TutorialWithRepo } from './tutorials.repo'

export interface TutorialRef {
  owner: string
  repo: string
  slug: string
  versionNo?: number | undefined
  shareToken?: string | undefined
}

export type TutorialCounts = DashboardSummary['counts']

export interface TutorialLibraryDeps {
  db: Db
  indexing: Pick<IndexingService, 'listFiles' | 'readFile' | 'readText' | 'snapshotRef'>
  reader: Pick<TutorialReader, 'readableVersion'>
  learning: Pick<LearningService, 'completionRatio' | 'completionRatios'>
}

export interface TutorialLibrary {
  list(userId: string, input: TutorialListInput): Promise<TutorialPage>
  summary(userId: string, tutorialId: string): Promise<TutorialSummaryDto>
  overview(viewer: Viewer, ref: TutorialRef): Promise<TutorialOverviewDto>
  chapter(viewer: Viewer, input: { versionId: string; chapterKey: string }): Promise<ChapterDto>
  source(viewer: Viewer, input: { versionId: string; path: string }): Promise<SourceFileDto>
  sourceTree(viewer: Viewer, input: { versionId: string }): Promise<SourceTreeDto>
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

type CurrentVersion = { versionNo: number; audience: Audience }

export function createTutorialLibrary(deps: TutorialLibraryDeps): TutorialLibrary {
  const { db, indexing, reader, learning } = deps
  const repo = tutorialsRepo(db)

  const summaryOf = (
    row: TutorialWithRepo,
    current: CurrentVersion | undefined,
    progress: number | null,
  ): TutorialSummaryDto => ({
    id: row.tutorial.id,
    slug: row.tutorial.slug,
    title: row.tutorial.title,
    owner: row.owner,
    repo: row.name,
    visibility: row.tutorial.visibility,
    audience: current?.audience ?? 'intermediate',
    currentVersionNo: current?.versionNo ?? 0,
    updatedAt: row.tutorial.updatedAt.toISOString(),
    progress,
  })

  const progressOf = async (viewer: Viewer, row: TutorialWithRepo) =>
    viewer.userId !== undefined && row.tutorial.currentVersionId
      ? await learning.completionRatio(viewer, row.tutorial.currentVersionId)
      : null

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
        summaryOf(
          { tutorial: row.tutorial, owner: row.owner, name: row.name, license: row.license },
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
      const row = await repo.findById(tutorialId)
      if (!row) notFound('Tutorial')
      const current = row.tutorial.currentVersionId
        ? await repo.findVersion(row.tutorial.currentVersionId)
        : undefined
      return summaryOf(row, current, await progressOf({ userId }, row))
    },

    async overview(viewer, ref) {
      const row = await repo.findBySlug(ref.owner, ref.repo, ref.slug)
      const access = { userId: viewer.userId, shareToken: ref.shareToken ?? viewer.shareToken }
      if (!row || !canRead(ownershipOf(row.tutorial), access)) notFound('Tutorial')

      const versions = await repo.versionsOf(row.tutorial.id)
      const current = versions.find((item) => item.id === row.tutorial.currentVersionId)
      const selected =
        ref.versionNo === undefined
          ? current
          : versions.find((item) => item.versionNo === ref.versionNo)
      if (!selected || !current) notFound('Tutorial version')

      const content = TutorialContent.parse(selected.content)
      const report = ValidationReport.parse(selected.validationReport)
      const snapshot = await indexing.snapshotRef(selected.snapshotId)
      const stale =
        snapshot !== undefined &&
        (await repo.isStale({
          repositoryId: row.tutorial.repositoryId,
          snapshotCreatedAt: snapshot.createdAt,
          paths: await repo.sourceRefPaths(selected.id),
        }))

      return {
        tutorial: summaryOf(row, current, await progressOf(viewer, row)),
        versionId: selected.id,
        commitSha: content.meta.repo.commitSha,
        draft: selected.status === 'draft',
        stale,
        newerVersionAvailable: selected.versionNo < current.versionNo,
        license: row.license,
        objectives: content.meta.objectives,
        prerequisites: content.meta.prerequisites,
        architectureDiagram: content.architecture
          ? {
              mermaid: content.architecture.diagram.mermaid,
              caption: content.architecture.diagram.caption,
            }
          : null,
        outline: content.chapters.map((chapter) => ({
          key: chapter.key,
          title: chapter.title,
          summary: chapter.summary,
          lessons: chapter.lessons.map((lesson) => ({
            key: lesson.key,
            title: lesson.title,
            minutes: lesson.minutes,
          })),
        })),
        versions: versions.map((item) => ({
          versionId: item.id,
          versionNo: item.versionNo,
          publishedAt: (item.publishedAt ?? new Date(0)).toISOString(),
        })),
        validation: { confidence: report.confidence, draft: report.draft },
        openQuestions: content.openQuestions,
      }
    },

    async chapter(viewer, input) {
      const version = await reader.readableVersion(viewer, input.versionId)
      const chapter = version.content.chapters.find((item) => item.key === input.chapterKey)
      if (!chapter) notFound('Chapter')

      const refIds = new Set(chapter.lessons.flatMap(lessonRefIds))
      return {
        versionId: version.versionId,
        chapter: learnerChapter(chapter),
        sourceRefs: Object.fromEntries(
          Object.entries(version.content.sourceRefs).filter(([refId]) => refIds.has(refId)),
        ),
      }
    },

    async source(viewer, input) {
      const version = await reader.readableVersion(viewer, input.versionId)
      const file = await indexing.readFile(version.snapshotId, input.path)
      const text = file && (await indexing.readText(version.snapshotId, input.path))
      if (!file || text === undefined) notFound('File')
      const { commitSha } = version.content.meta.repo
      return {
        path: file.path,
        language: file.language,
        blobSha: file.blobSha,
        commitSha,
        content: text,
        permalink: permalinkOf(version.owner, version.repo, commitSha, file.path),
      }
    },

    async sourceTree(viewer, input) {
      const version = await reader.readableVersion(viewer, input.versionId)
      const files = await indexing.listFiles(version.snapshotId)
      return toSourceTree(version.content.meta.repo.commitSha, files)
    },

    async counts(userId) {
      const groups = await repo.countsFor(userId)
      const count = (value: Visibility) =>
        groups.find((group) => group.visibility === value)?.total ?? 0
      return {
        total: groups.reduce((sum, group) => sum + group.total, 0),
        draft: await repo.draftCountFor(userId),
        private: count('private'),
        link: count('link'),
        public: count('public'),
      }
    },

    async recentPublished(userId, input) {
      const rows = await repo.recentPublishedFor(userId, input.zone, input.limit, input.offset)
      return rows.map((row) => ({
        id: row.versionId,
        kind: 'tutorial_published',
        title: `${row.title} published`,
        localDate: row.localDate,
        at: (row.publishedAt ?? new Date(0)).toISOString(),
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

function learnerChapter(chapter: Chapter): LearnerChapter {
  return {
    key: chapter.key,
    title: chapter.title,
    summary: chapter.summary,
    objectives: chapter.objectives,
    prerequisites: chapter.prerequisites,
    lessons: chapter.lessons.map((lesson) => ({
      key: lesson.key,
      title: lesson.title,
      minutes: lesson.minutes,
      blocks: lesson.blocks,
      quiz: lesson.quiz?.map(learnerQuestion),
    })),
  }
}

function learnerQuestion(question: Question): LearnerQuestion {
  return {
    key: question.key,
    kind: question.kind,
    prompt: question.prompt,
    options: question.options,
    evidence: question.evidence,
  }
}

function permalinkOf(owner: string, repo: string, commitSha: string, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `https://github.com/${owner}/${repo}/blob/${commitSha}/${encoded}`
}
