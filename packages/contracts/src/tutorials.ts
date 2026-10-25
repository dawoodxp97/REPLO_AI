import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Audience, CommitSha, IdCursor, OkResult, Visibility, pageInput } from './common'
import { Chapter, Lesson, QuestionOption, SourceRef, ValidationReport } from './tutorial/content'

export const TutorialSummaryDto = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  owner: z.string(),
  repo: z.string(),
  visibility: Visibility,
  audience: Audience,
  currentVersionNo: z.number().int(),
  updatedAt: z.iso.datetime(),
  progress: z.number().min(0).max(1).nullable(),
})
export type TutorialSummaryDto = z.infer<typeof TutorialSummaryDto>

export const TutorialListInput = pageInput(IdCursor)
export type TutorialListInput = z.infer<typeof TutorialListInput>

export const TutorialPage = z.object({
  items: z.array(TutorialSummaryDto),
  nextCursor: IdCursor.nullable(),
})
export type TutorialPage = z.infer<typeof TutorialPage>

export const TutorialOverviewDto = z.object({
  tutorial: TutorialSummaryDto,
  versionId: z.uuid(),
  commitSha: CommitSha,
  draft: z.boolean(),
  stale: z.boolean(),
  newerVersionAvailable: z.boolean(),
  license: z.string().nullable(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  architectureDiagram: z.object({ mermaid: z.string(), caption: z.string() }).nullable(),
  outline: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      summary: z.string(),
      lessons: z.array(z.object({ key: z.string(), title: z.string(), minutes: z.number() })),
    }),
  ),
  versions: z.array(
    z.object({ versionId: z.uuid(), versionNo: z.number().int(), publishedAt: z.iso.datetime() }),
  ),
  validation: ValidationReport.pick({ confidence: true, draft: true }),
  openQuestions: z.array(z.string()),
})
export type TutorialOverviewDto = z.infer<typeof TutorialOverviewDto>

export const LearnerQuestion = z.object({
  key: z.string(),
  kind: z.enum(['multiple_choice', 'true_false']),
  prompt: z.string(),
  options: z.array(QuestionOption),
  evidence: z.array(z.object({ refId: z.string(), note: z.string().optional() })),
})
export type LearnerQuestion = z.infer<typeof LearnerQuestion>

export const LearnerLesson = Lesson.omit({ quiz: true }).extend({
  quiz: z.array(LearnerQuestion).optional(),
})
export type LearnerLesson = z.infer<typeof LearnerLesson>

export const LearnerChapter = Chapter.omit({ lessons: true }).extend({
  lessons: z.array(LearnerLesson),
})
export type LearnerChapter = z.infer<typeof LearnerChapter>

export const ChapterDto = z.object({
  versionId: z.uuid(),
  chapter: LearnerChapter,
  sourceRefs: z.record(z.string(), SourceRef),
})
export type ChapterDto = z.infer<typeof ChapterDto>

export const SourceFileDto = z.object({
  path: z.string(),
  language: z.string().nullable(),
  blobSha: z.string(),
  commitSha: CommitSha,
  content: z.string(),
  permalink: z.url(),
})
export type SourceFileDto = z.infer<typeof SourceFileDto>

export const FILE_ROLES = ['source', 'test', 'config', 'doc', 'generated', 'asset'] as const
export const FileRole = z.enum(FILE_ROLES)
export type FileRole = z.infer<typeof FileRole>

export const SourceTreeEntry = z.object({
  path: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  language: z.string().nullable(),
  role: FileRole,
  readable: z.boolean(),
})
export type SourceTreeEntry = z.infer<typeof SourceTreeEntry>

export const SourceTreeDto = z.object({
  commitSha: CommitSha,
  files: z.array(SourceTreeEntry),
})
export type SourceTreeDto = z.infer<typeof SourceTreeDto>

export const TutorialSummaryRef = z.object({ tutorialId: z.uuid() })

export const tutorialsContract = {
  list: oc
    .route({ method: 'GET', path: '/tutorials' })
    .input(TutorialListInput)
    .output(TutorialPage),
  get: oc
    .route({ method: 'GET', path: '/tutorials/{owner}/{repo}/{slug}' })
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        slug: z.string(),
        versionNo: z.number().int().positive().optional(),
        shareToken: z.string().optional(),
      }),
    )
    .output(TutorialOverviewDto),
  getChapter: oc
    .route({ method: 'GET', path: '/tutorial-versions/{versionId}/chapters/{chapterKey}' })
    .input(
      z.object({ versionId: z.uuid(), chapterKey: z.string(), shareToken: z.string().optional() }),
    )
    .output(ChapterDto),
  getSource: oc
    .route({ method: 'GET', path: '/tutorial-versions/{versionId}/source' })
    .input(
      z.object({
        versionId: z.uuid(),
        path: z.string().max(1024),
        shareToken: z.string().optional(),
      }),
    )
    .output(SourceFileDto),
  sourceTree: oc
    .route({ method: 'GET', path: '/tutorial-versions/{versionId}/tree' })
    .input(z.object({ versionId: z.uuid(), shareToken: z.string().optional() }))
    .output(SourceTreeDto),
  setVisibility: oc
    .route({ method: 'PUT', path: '/tutorials/{tutorialId}/visibility' })
    .input(z.object({ tutorialId: z.uuid(), visibility: Visibility }))
    .output(TutorialSummaryDto)
    .errors({ PUBLIC_REQUIRES_OPEN_LICENSE: {} }),
  createShareLink: oc
    .route({ method: 'POST', path: '/tutorials/{tutorialId}/share-link' })
    .input(TutorialSummaryRef)
    .output(z.object({ token: z.string(), url: z.url() })),
  delete: oc
    .route({ method: 'DELETE', path: '/tutorials/{tutorialId}' })
    .input(TutorialSummaryRef)
    .output(OkResult),
  report: oc
    .route({ method: 'POST', path: '/tutorials/{tutorialId}/report' })
    .input(
      z.object({
        tutorialId: z.uuid(),
        reason: z.string().min(1).max(1000),
      }),
    )
    .output(OkResult),
}
