import type { TutorialRef } from '@replo/contracts'

export type { TutorialRef }

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

export interface TutorialLinkContext {
  version?: number | undefined
  shareToken?: string | undefined
}

export function withTutorialContext(href: string, context: TutorialLinkContext): string {
  return withQuery(href, { version: context.version, share: context.shareToken })
}

export function tutorialPath({ owner, repo, slug }: TutorialRef): string {
  return `/tutorials/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`
}

export function lessonPath(tutorial: TutorialRef, chapterKey: string, lessonKey: string): string {
  return `${tutorialPath(tutorial)}/learn/${encodeURIComponent(chapterKey)}/${encodeURIComponent(lessonKey)}`
}

export function progressPath(tutorial: TutorialRef): string {
  return `${tutorialPath(tutorial)}/progress`
}

export function codePath(tutorial: TutorialRef): string {
  return `${tutorialPath(tutorial)}/code`
}

export function parseVersion(value: string | undefined): number | undefined {
  const version = Number(value)
  return Number.isInteger(version) && version > 0 ? version : undefined
}

export function latestVersionNo(versions: readonly { versionNo: number }[]): number {
  return Math.max(0, ...versions.map((version) => version.versionNo))
}

export interface TutorialLinks {
  overview(): string
  progress(): string
  lesson(position: { chapterKey: string; lessonKey: string }): string
  sourceExplorer(path?: string): string
}

export function createTutorialLinks(
  tutorial: TutorialRef,
  context: TutorialLinkContext = {},
): TutorialLinks {
  return {
    overview: () => withTutorialContext(tutorialPath(tutorial), context),
    progress: () => withTutorialContext(progressPath(tutorial), context),
    lesson: ({ chapterKey, lessonKey }) =>
      withTutorialContext(lessonPath(tutorial, chapterKey, lessonKey), context),
    sourceExplorer: (path) => withTutorialContext(withQuery(codePath(tutorial), { path }), context),
  }
}
