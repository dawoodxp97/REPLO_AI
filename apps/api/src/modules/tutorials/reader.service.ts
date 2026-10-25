import { TutorialContent } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { canRead, ownershipOf, type Viewer } from './access'
import { tutorialsRepo } from './tutorials.repo'

export interface ReadableVersion {
  versionId: string
  tutorialId: string
  snapshotId: string
  owner: string
  repo: string
  slug: string
  content: TutorialContent
}

interface LessonEntry {
  chapterKey: string
  lessonKey: string
  title: string
  position: number
}

export interface TutorialReader {
  readableVersion(viewer: Viewer, versionId: string): Promise<ReadableVersion>
  lessonsOf(viewer: Viewer, versionId: string): Promise<LessonEntry[]>
  currentVersionOf(viewer: Viewer, tutorialId: string): Promise<string>
  ownedLessonKeys(userId: string, versionIds: readonly string[]): Promise<Map<string, string[]>>
}

export function createTutorialReader(db: Db): TutorialReader {
  const repo = tutorialsRepo(db)

  const readableVersion: TutorialReader['readableVersion'] = async (viewer, versionId) => {
    const version = await repo.findVersion(versionId)
    if (!version) notFound('Tutorial version')
    const row = await repo.findById(version.tutorialId)
    if (!row || !canRead(ownershipOf(row.tutorial), viewer)) notFound('Tutorial version')
    return {
      versionId: version.id,
      tutorialId: row.tutorial.id,
      snapshotId: version.snapshotId,
      owner: row.owner,
      repo: row.name,
      slug: row.tutorial.slug,
      content: TutorialContent.parse(version.content),
    }
  }

  return {
    readableVersion,

    async lessonsOf(viewer, versionId) {
      await readableVersion(viewer, versionId)
      return repo.lessonsOf(versionId)
    },

    async ownedLessonKeys(userId, versionIds) {
      const keys = new Map<string, string[]>()
      for (const row of await repo.lessonKeysOf(userId, versionIds)) {
        const lessonKeys = keys.get(row.versionId)
        if (lessonKeys) lessonKeys.push(row.lessonKey)
        else keys.set(row.versionId, [row.lessonKey])
      }
      return keys
    },

    async currentVersionOf(viewer, tutorialId) {
      const row = await repo.findById(tutorialId)
      if (!row || !canRead(ownershipOf(row.tutorial), viewer)) notFound('Tutorial')
      if (!row.tutorial.currentVersionId) notFound('Tutorial version')
      return row.tutorial.currentVersionId
    },
  }
}
