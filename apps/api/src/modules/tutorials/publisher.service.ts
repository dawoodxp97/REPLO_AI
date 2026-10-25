import { randomBytes } from 'node:crypto'
import type { Audience, TutorialContent, ValidationReport } from '@replo/contracts'
import { uuidv7 } from 'uuidv7'
import type { Db, Tx } from '../../platform/db/client'
import type { TutorialGenerator } from '../../platform/db/schema'
import { allLessons, lessonRefIds } from './lesson-content'
import { tutorialsRepo, type TutorialRow, type TutorialVersionRow } from './tutorials.repo'

const SLUG_MAX_LENGTH = 60
const SUFFIX_LENGTH = 8
const FALLBACK_SLUG = 'tutorial'

export interface PublishInput {
  userId: string
  repositoryId: string
  snapshotId: string
  jobId: string
  audience: Audience
  content: TutorialContent
  report: ValidationReport
  generator: TutorialGenerator
}

export interface PublishedVersion {
  tutorialId: string
  versionId: string
  versionNo: number
}

export interface TutorialPublisher {
  publishVersion(tx: Tx, input: PublishInput): Promise<PublishedVersion>
  versionForJob(jobId: string): Promise<PublishedVersion | undefined>
}

export function createTutorialPublisher(db: Db): TutorialPublisher {
  return {
    async publishVersion(tx, input) {
      const writer = tutorialsRepo(tx)
      const replayed = await writer.findVersionByJob(input.jobId)
      if (replayed) return toPublished(replayed)

      const { content } = input
      const tutorial =
        (await writer.findForUserRepo(input.userId, input.repositoryId)) ??
        (await createTutorial(tx, input))

      const versionNo = (await writer.latestVersionNo(tutorial.id)) + 1
      const version =
        (await writer.insertVersion({
          tutorialId: tutorial.id,
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
        })) ?? (await writer.findVersionByJob(input.jobId))
      if (!version) throw new Error('tutorial version insert and replay both failed')

      await writer.insertSourceRefs(sourceRefRows(version.id, content))
      await writer.insertLessons(lessonRows(version.id, content))
      await writer.touch(tutorial.id, { title: content.meta.title, currentVersionId: version.id })
      return toPublished(version)
    },

    async versionForJob(jobId) {
      const row = await tutorialsRepo(db).findVersionByJob(jobId)
      return row ? toPublished(row) : undefined
    },
  }
}

function toPublished(
  row: Pick<TutorialVersionRow, 'tutorialId' | 'id' | 'versionNo'>,
): PublishedVersion {
  return { tutorialId: row.tutorialId, versionId: row.id, versionNo: row.versionNo }
}

async function createTutorial(tx: Tx, input: PublishInput): Promise<TutorialRow> {
  const writer = tutorialsRepo(tx)
  const id = uuidv7()
  const base = slugify(input.content.meta.repo.name)
  const taken = await writer.slugTaken(input.repositoryId, base)
  return writer.insertTutorial({
    id,
    userId: input.userId,
    repositoryId: input.repositoryId,
    slug: taken ? `${base}-${randomBytes(SUFFIX_LENGTH / 2).toString('hex')}` : base,
    title: input.content.meta.title,
    visibility: 'private',
  })
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug.slice(0, SLUG_MAX_LENGTH) : FALLBACK_SLUG
}

function lessonRows(versionId: string, content: TutorialContent) {
  return allLessons(content).map(({ chapterKey, lesson }, position) => ({
    versionId,
    chapterKey,
    lessonKey: lesson.key,
    title: lesson.title,
    position,
  }))
}

function sourceRefRows(versionId: string, content: TutorialContent) {
  const lessons = allLessons(content)
  const lessonOfRef = new Map<string, string>()
  for (const { lesson } of lessons) {
    for (const refId of lessonRefIds(lesson)) {
      if (!lessonOfRef.has(refId)) lessonOfRef.set(refId, lesson.key)
    }
  }
  const fallbackLessonKey = lessons[0]?.lesson.key
  return Object.entries(content.sourceRefs).flatMap(([refId, ref]) => {
    const lessonKey = lessonOfRef.get(refId) ?? fallbackLessonKey
    if (lessonKey === undefined) return []
    return [
      {
        versionId,
        lessonKey,
        refId,
        path: ref.path,
        startLine: ref.startLine,
        endLine: ref.endLine,
        blobSha: ref.blobSha,
        symbolKey: ref.symbolKey ?? null,
      },
    ]
  })
}
