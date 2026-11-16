import type { CourseRef } from '@replo/contracts'

export type { CourseRef }

export type QueryValue = string | number | undefined | null

export function withQuery(href: string, params: Record<string, QueryValue>): string {
  const [path, existing = ''] = href.split('?', 2)
  const query = new URLSearchParams(existing)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') query.delete(key)
    else query.set(key, String(value))
  }
  const search = query.toString()
  return search ? `${path}?${search}` : (path ?? href)
}

export interface CourseLinkContext {
  version?: number | undefined
  shareToken?: string | undefined
}

export function withCourseContext(href: string, context: CourseLinkContext): string {
  return withQuery(href, { version: context.version })
}

export function coursePath({ owner, repo, slug }: CourseRef): string {
  return `/courses/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`
}

export function lessonPath(course: CourseRef, chapterKey: string, lessonKey: string): string {
  return `${coursePath(course)}/learn/${encodeURIComponent(chapterKey)}/${encodeURIComponent(lessonKey)}`
}

export function progressPath(course: CourseRef): string {
  return `${coursePath(course)}/progress`
}

export function codePath(course: CourseRef): string {
  return `${coursePath(course)}/code`
}

export function parseVersion(value: string | undefined): number | undefined {
  const version = Number(value)
  return Number.isInteger(version) && version > 0 ? version : undefined
}

export function latestVersionNo(versions: readonly { versionNo: number }[]): number {
  return Math.max(0, ...versions.map((version) => version.versionNo))
}

export interface CourseLinks {
  overview(): string
  progress(): string
  lesson(position: { chapterKey: string; lessonKey: string }): string
  sourceExplorer(path?: string): string
}

export function createCourseLinks(course: CourseRef, context: CourseLinkContext = {}): CourseLinks {
  return {
    overview: () => withCourseContext(coursePath(course), context),
    progress: () => withCourseContext(progressPath(course), context),
    lesson: ({ chapterKey, lessonKey }) =>
      withCourseContext(lessonPath(course, chapterKey, lessonKey), context),
    sourceExplorer: (path) => withCourseContext(withQuery(codePath(course), { path }), context),
  }
}
