import { TutorialContent, type Audience, type TutorialRef } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { canRead, ownershipOf, readableTutorial, type Viewer } from './access'
import { tutorialsRepo, type VersionHead } from './tutorials.repo'

export interface ReadableHead {
  versionId: string
  tutorialId: string
  snapshotId: string
  versionNo: number
  audience: Audience
  owner: string
  repo: string
  slug: string
}

export interface ReadableVersion extends ReadableHead {
  content: TutorialContent
}

interface LessonEntry {
  chapterKey: string
  lessonKey: string
  title: string
  position: number
}

export interface VersionAccess {
  readableHead(viewer: Viewer, versionId: string): Promise<ReadableHead>
  findReadableHead(viewer: Viewer, versionId: string): Promise<ReadableHead | undefined>
  readableVersion(viewer: Viewer, versionId: string): Promise<ReadableVersion>
  lessonsOfVersion(versionId: string): Promise<LessonEntry[]>
  currentVersionOf(viewer: Viewer, tutorialId: string): Promise<string>
  refOf(viewer: Viewer, tutorialId: string): Promise<TutorialRef | undefined>
  ownedLessonKeys(userId: string, versionIds: readonly string[]): Promise<Map<string, string[]>>
}

export function createVersionAccess(db: Db): VersionAccess {
  const repo = tutorialsRepo(db)

  const headOf = (row: VersionHead, versionId: string): ReadableHead => ({
    versionId,
    tutorialId: row.tutorial.id,
    snapshotId: row.version.snapshotId,
    versionNo: row.version.versionNo,
    audience: row.version.audience,
    owner: row.owner,
    repo: row.name,
    slug: row.tutorial.slug,
  })

  const readableHead: VersionAccess['readableHead'] = async (viewer, versionId) =>
    headOf(
      readableTutorial(await repo.findVersionHead(versionId), viewer, 'Tutorial version'),
      versionId,
    )

  const findReadableHead: VersionAccess['findReadableHead'] = async (viewer, versionId) => {
    const row = await repo.findVersionHead(versionId)
    if (!row || !canRead(ownershipOf(row.tutorial), viewer)) return undefined
    return headOf(row, versionId)
  }

  const readableVersion: VersionAccess['readableVersion'] = async (viewer, versionId) => {
    const head = await readableHead(viewer, versionId)
    const version = await repo.findVersion(versionId)
    if (!version) notFound('Tutorial version')
    return { ...head, content: TutorialContent.parse(version.content) }
  }

  return {
    readableHead,
    findReadableHead,
    readableVersion,
    lessonsOfVersion: (versionId) => repo.lessonsOf(versionId),

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
      const row = readableTutorial(await repo.findById(tutorialId), viewer, 'Tutorial')
      if (!row.tutorial.currentVersionId) notFound('Tutorial version')
      return row.tutorial.currentVersionId
    },

    async refOf(viewer, tutorialId) {
      const row = await repo.findById(tutorialId)
      if (!row || !canRead(ownershipOf(row.tutorial), viewer)) return undefined
      return { owner: row.owner, repo: row.name, slug: row.tutorial.slug }
    },
  }
}
