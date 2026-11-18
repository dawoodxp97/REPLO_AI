import { randomBytes } from 'node:crypto'
import type { Audience, CourseContent, ValidationReport } from '@replo/contracts'
import { uuidv7 } from 'uuidv7'
import type { Db, Tx } from '../../platform/db/client'
import type { CourseGenerator } from '../../platform/db/schema'
import { lessonRows, slugify, sourceRefRows } from './publish-rows'
import { coursesRepo, type CourseRow, type CourseVersionRow } from './courses.repo'

const SUFFIX_LENGTH = 8
const SLUG_ATTEMPTS = 5

export interface PublishInput {
  userId: string
  repositoryId: string
  snapshotId: string
  jobId: string
  audience: Audience
  content: CourseContent
  report: ValidationReport
  generator: CourseGenerator
}

export interface PublishedVersion {
  courseId: string
  versionId: string
  versionNo: number
}

export interface CoursePublisher {
  publishVersion(tx: Tx, input: PublishInput): Promise<PublishedVersion>
  versionForJob(jobId: string): Promise<PublishedVersion | undefined>
}

export function createCoursePublisher(db: Db): CoursePublisher {
  return {
    async publishVersion(tx, input) {
      const writer = coursesRepo(tx)
      const replayed = await writer.findVersionByJob(input.jobId)
      if (replayed) return toPublished(replayed)

      const { content } = input
      const course =
        (await writer.findForUserRepo(input.userId, input.repositoryId)) ??
        (await createCourse(tx, input))

      // generation_job_id is unique per version. Under the course lock, a replayed publish
      // for the same job returns the version it already made instead of adding another.
      await writer.lockById(course.id)
      const racedReplay = await writer.findVersionByJob(input.jobId)
      if (racedReplay) return toPublished(racedReplay)

      const versionNo = (await writer.latestVersionNo(course.id)) + 1
      const version = await writer.insertVersion({
        courseId: course.id,
        versionNo,
        snapshotId: input.snapshotId,
        schemaVersion: content.schemaVersion,
        status: input.report.draft ? 'draft' : 'published',
        audience: input.audience,
        content,
        validationReport: input.report,
        generator: input.generator,
        generationJobId: input.jobId,
        publishedAt: new Date(),
      })
      if (!version) throw new Error(`course version ${versionNo} could not be inserted`)

      await writer.insertSourceRefs(sourceRefRows(version.id, content))
      await writer.insertLessons(lessonRows(version.id, content))
      await writer.insertDiagrams(version.id, content.diagrams)
      await writer.touch(course.id, { title: content.meta.title, currentVersionId: version.id })
      return toPublished(version)
    },

    async versionForJob(jobId) {
      const row = await coursesRepo(db).findVersionByJob(jobId)
      return row ? toPublished(row) : undefined
    },
  }
}

function toPublished(
  row: Pick<CourseVersionRow, 'courseId' | 'id' | 'versionNo'>,
): PublishedVersion {
  return { courseId: row.courseId, versionId: row.id, versionNo: row.versionNo }
}

async function createCourse(tx: Tx, input: PublishInput): Promise<CourseRow> {
  const writer = coursesRepo(tx)
  const base = slugify(input.content.meta.repo.name)
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const created = await writer.insertCourse({
      id: uuidv7(),
      userId: input.userId,
      repositoryId: input.repositoryId,
      slug: attempt === 0 ? base : `${base}-${randomBytes(SUFFIX_LENGTH / 2).toString('hex')}`,
      title: input.content.meta.title,
    })
    if (created) return created
    const existing = await writer.findForUserRepo(input.userId, input.repositoryId)
    if (existing) return existing
  }
  throw new Error('no free course slug after repeated attempts')
}
