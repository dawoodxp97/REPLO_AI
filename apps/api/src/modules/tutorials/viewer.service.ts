import {
  TutorialContent,
  ValidationReport,
  type Chapter,
  type ChapterDto,
  type LearnerChapter,
  type LearnerQuestion,
  type Question,
  type SourceFileDto,
  type SourceTreeDto,
  type TutorialOverviewDto,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import type { IndexingService } from '../indexing/indexing.service'
import type { LearningService } from '../learning/learning.service'
import { canRead, ownershipOf, type Viewer } from './access'
import { lessonRefIds } from './lesson-content'
import { toSourceTree } from './source-tree'
import type { TutorialReader } from './reader.service'
import { toTutorialSummary } from './tutorial-summary'
import { tutorialsRepo } from './tutorials.repo'

export interface TutorialRef {
  owner: string
  repo: string
  slug: string
  versionNo?: number | undefined
  shareToken?: string | undefined
}

export interface TutorialViewerDeps {
  db: Db
  indexing: Pick<IndexingService, 'listFiles' | 'readFile' | 'readText' | 'snapshotRef'>
  reader: Pick<TutorialReader, 'readableVersion'>
  learning: Pick<LearningService, 'completionRatio'>
}

export interface TutorialViewer {
  overview(viewer: Viewer, ref: TutorialRef): Promise<TutorialOverviewDto>
  chapter(viewer: Viewer, input: { versionId: string; chapterKey: string }): Promise<ChapterDto>
  source(viewer: Viewer, input: { versionId: string; path: string }): Promise<SourceFileDto>
  sourceTree(viewer: Viewer, input: { versionId: string }): Promise<SourceTreeDto>
}

export function createTutorialViewer(deps: TutorialViewerDeps): TutorialViewer {
  const { db, indexing, reader, learning } = deps
  const repo = tutorialsRepo(db)

  return {
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
        tutorial: toTutorialSummary(
          row,
          current,
          viewer.userId !== undefined && row.tutorial.currentVersionId
            ? await learning.completionRatio(viewer, row.tutorial.currentVersionId)
            : null,
        ),
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
