import {
  upcastCourseContent,
  type Audience,
  type CourseContent,
  type CourseRef,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { canRead, ownershipOf, readableCourse, type Viewer } from './access'
import { coursesRepo, type VersionHead } from './courses.repo'

export interface ReadableHead {
  versionId: string
  courseId: string
  snapshotId: string
  versionNo: number
  audience: Audience
  owner: string
  repo: string
  slug: string
}

export interface ReadableVersion extends ReadableHead {
  content: CourseContent
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
  currentVersionOf(viewer: Viewer, courseId: string): Promise<string>
  refOf(viewer: Viewer, courseId: string): Promise<CourseRef | undefined>
  ownedLessonKeys(userId: string, versionIds: readonly string[]): Promise<Map<string, string[]>>
}

export function createVersionAccess(db: Db): VersionAccess {
  const repo = coursesRepo(db)

  const headOf = (row: VersionHead, versionId: string): ReadableHead => ({
    versionId,
    courseId: row.course.id,
    snapshotId: row.version.snapshotId,
    versionNo: row.version.versionNo,
    audience: row.version.audience,
    owner: row.owner,
    repo: row.name,
    slug: row.course.slug,
  })

  const readableHead: VersionAccess['readableHead'] = async (viewer, versionId) =>
    headOf(
      readableCourse(await repo.findVersionHead(versionId), viewer, 'Course version'),
      versionId,
    )

  const findReadableHead: VersionAccess['findReadableHead'] = async (viewer, versionId) => {
    const row = await repo.findVersionHead(versionId)
    if (!row || !canRead(ownershipOf(row.course), viewer)) return undefined
    return headOf(row, versionId)
  }

  const readableVersion: VersionAccess['readableVersion'] = async (viewer, versionId) => {
    const head = await readableHead(viewer, versionId)
    const version = await repo.findVersion(versionId)
    if (!version) notFound('Course version')
    return { ...head, content: upcastCourseContent(version.content) }
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

    async currentVersionOf(viewer, courseId) {
      const row = readableCourse(await repo.findById(courseId), viewer, 'Course')
      if (!row.course.currentVersionId) notFound('Course version')
      return row.course.currentVersionId
    },

    async refOf(viewer, courseId) {
      const row = await repo.findById(courseId)
      if (!row || !canRead(ownershipOf(row.course), viewer)) return undefined
      return { owner: row.owner, repo: row.name, slug: row.course.slug }
    },
  }
}
