import type { TutorialOverviewDto } from '@replo/contracts'
import Link from 'next/link'
import { lessonPath, type TutorialRef } from '@/lib/tutorial-paths'

export type OutlineChapter = TutorialOverviewDto['outline'][number]

export function TutorialOutline({
  tutorial,
  chapters,
  shareToken,
}: {
  tutorial: TutorialRef
  chapters: readonly OutlineChapter[]
  shareToken?: string
}) {
  return (
    <ol className="space-y-6">
      {chapters.map((chapter, index) => (
        <li key={chapter.key} className="space-y-2">
          <h3 className="font-serif text-xl font-medium">
            <span className="mr-2 font-mono text-sm text-muted-foreground">{index + 1}.</span>
            {chapter.title}
          </h3>
          <p className="text-sm text-muted-foreground">{chapter.summary}</p>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {chapter.lessons.map((lesson) => (
              <li key={lesson.key}>
                <Link
                  href={withShare(lessonPath(tutorial, chapter.key, lesson.key), shareToken)}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent"
                >
                  <span>{lesson.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {lesson.minutes} min
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export function withShare(href: string, shareToken: string | undefined): string {
  return shareToken ? `${href}?share=${encodeURIComponent(shareToken)}` : href
}
