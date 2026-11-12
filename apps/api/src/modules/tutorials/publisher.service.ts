import { randomBytes } from 'node:crypto'
import type { Audience, TutorialContent, ValidationReport } from '@replo/contracts'
import { uuidv7 } from 'uuidv7'
import type { Db, Tx } from '../../platform/db/client'
import type { TutorialGenerator } from '../../platform/db/schema'
import { lessonRows, slugify, sourceRefRows } from './publish-rows'
import { tutorialsRepo, type TutorialRow, type TutorialVersionRow } from './tutorials.repo'

const SUFFIX_LENGTH = 8
const SLUG_ATTEMPTS = 5

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

      // generation_job_id is unique per version. Under the tutorial lock, a replayed publish
      // for the same job returns the version it already made instead of adding another.
      await writer.lockById(tutorial.id)
      const racedReplay = await writer.findVersionByJob(input.jobId)
      if (racedReplay) return toPublished(racedReplay)

      const versionNo = (await writer.latestVersionNo(tutorial.id)) + 1
      const version = await writer.insertVersion({
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
      })
      if (!version) throw new Error(`tutorial version ${versionNo} could not be inserted`)

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
  const base = slugify(input.content.meta.repo.name)
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const created = await writer.insertTutorial({
      id: uuidv7(),
      userId: input.userId,
      repositoryId: input.repositoryId,
      slug: attempt === 0 ? base : `${base}-${randomBytes(SUFFIX_LENGTH / 2).toString('hex')}`,
      title: input.content.meta.title,
      visibility: 'private',
    })
    if (created) return created
    const existing = await writer.findForUserRepo(input.userId, input.repositoryId)
    if (existing) return existing
  }
  throw new Error('no free tutorial slug after repeated attempts')
}
