import { notFound } from '../../platform/errors'
import type { CourseRow, CourseWithRepo } from './courses.repo'

export interface Viewer {
  userId?: string | undefined
}

interface Ownership {
  ownerId: string | null
}

export function canRead(course: Ownership, viewer: Viewer): boolean {
  return viewer.userId !== undefined && course.ownerId === viewer.userId
}

export function ownershipOf(course: CourseRow): Ownership {
  return { ownerId: course.userId }
}

export function readableCourse<T extends CourseWithRepo>(
  row: T | undefined,
  viewer: Viewer,
  label: string,
): T {
  // Not found, never forbidden: a stranger must not learn that a private course
  // exists (RULES §0.4).
  if (!row || !canRead(ownershipOf(row.course), viewer)) notFound(label)
  return row
}

export function isOwner(course: Pick<Ownership, 'ownerId'>, userId: string): boolean {
  return course.ownerId === userId
}

export function coursePath(owner: string, repo: string, slug: string): string {
  return `/courses/${owner}/${repo}/${slug}`
}
