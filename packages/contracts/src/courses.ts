import { oc } from '@orpc/contract'
import { z } from 'zod'
import { Audience, CommitSha, IdCursor, OkResult, pageInput, pageOutput } from './common'
import {
  Chapter,
  Evidence,
  Lesson,
  QuestionKind,
  QuestionOption,
  SourceRef,
  ValidationReport,
} from './course/content'

export const CourseSummaryDto = z.object({
  id: z.uuid(),
  slug: z.string(),
  title: z.string(),
  owner: z.string(),
  repo: z.string(),
  audience: Audience,
  currentVersionNo: z.number().int(),
  updatedAt: z.iso.datetime(),
  progress: z.number().min(0).max(1).nullable(),
})
export type CourseSummaryDto = z.infer<typeof CourseSummaryDto>

export const CourseListInput = pageInput(IdCursor)
export type CourseListInput = z.infer<typeof CourseListInput>

export const CoursePage = pageOutput(CourseSummaryDto, IdCursor)
export type CoursePage = z.infer<typeof CoursePage>

export const CourseOverviewDto = z.object({
  course: CourseSummaryDto,
  versionId: z.uuid(),
  commitSha: CommitSha,
  draft: z.boolean(),
  newerVersionAvailable: z.boolean(),
  objectives: z.array(z.string()),
  prerequisites: z.array(z.string()),
  architectureDiagram: z.object({ mermaid: z.string(), caption: z.string() }).nullable(),
  outline: z.array(
    Chapter.pick({ key: true, title: true, summary: true }).extend({
      lessons: z.array(Lesson.pick({ key: true, title: true, minutes: true })),
    }),
  ),
  versions: z.array(
    z.object({ versionId: z.uuid(), versionNo: z.number().int(), publishedAt: z.iso.datetime() }),
  ),
  validation: ValidationReport.pick({ confidence: true, draft: true }),
  openQuestions: z.array(z.string()),
})
export type CourseOverviewDto = z.infer<typeof CourseOverviewDto>

export const LearnerQuestion = z.object({
  key: z.string(),
  kind: QuestionKind,
  prompt: z.string(),
  options: z.array(QuestionOption),
  evidence: z.array(Evidence),
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

export const CourseSummaryRef = z.object({ courseId: z.uuid() })

export const coursesContract = {
  list: oc.route({ method: 'GET', path: '/courses' }).input(CourseListInput).output(CoursePage),
  get: oc
    .route({ method: 'GET', path: '/courses/{owner}/{repo}/{slug}' })
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        slug: z.string(),
        versionNo: z.number().int().positive().optional(),
      }),
    )
    .output(CourseOverviewDto),
  getChapter: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/chapters/{chapterKey}' })
    .input(z.object({ versionId: z.uuid(), chapterKey: z.string() }))
    .output(ChapterDto),
  getSource: oc
    .route({ method: 'GET', path: '/course-versions/{versionId}/source' })
    .input(
      z.object({
        versionId: z.uuid(),
        path: z.string().max(1024),
      }),
    )
    .output(SourceFileDto),
  delete: oc
    .route({ method: 'DELETE', path: '/courses/{courseId}' })
    .input(CourseSummaryRef)
    .output(OkResult),
}
