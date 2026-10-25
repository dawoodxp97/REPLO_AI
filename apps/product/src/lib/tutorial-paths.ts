export interface TutorialRef {
  owner: string
  repo: string
  slug: string
}

export function tutorialPath({ owner, repo, slug }: TutorialRef): string {
  return `/tutorials/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(slug)}`
}

export function lessonPath(tutorial: TutorialRef, chapterKey: string, lessonKey: string): string {
  return `${tutorialPath(tutorial)}/learn/${encodeURIComponent(chapterKey)}/${encodeURIComponent(lessonKey)}`
}
