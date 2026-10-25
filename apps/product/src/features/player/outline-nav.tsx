import type { LessonStatus, TutorialOverviewDto } from '@replo/contracts'
import { cn } from '@replo/ui'
import Link from 'next/link'
import { lessonPath, type TutorialRef } from '@/lib/tutorial-paths'
import { withShare } from '@/features/tutorials/tutorial-outline'

export interface OutlineNavProps {
  tutorial: TutorialRef
  outline: TutorialOverviewDto['outline']
  activeLessonKey: string
  lessonStatus: Readonly<Record<string, LessonStatus | undefined>>
  shareToken?: string
}

export function OutlineNav({
  tutorial,
  outline,
  activeLessonKey,
  lessonStatus,
  shareToken,
}: OutlineNavProps) {
  return (
    <nav aria-label="Lessons" className="space-y-4 text-sm">
      {outline.map((chapter, index) => {
        const containsActive = chapter.lessons.some((lesson) => lesson.key === activeLessonKey)
        return (
          <details key={chapter.key} open={containsActive}>
            <summary className="cursor-pointer font-medium">
              {index + 1}. {chapter.title}
            </summary>
            <ul className="mt-2 space-y-1 pl-2">
              {chapter.lessons.map((lesson) => {
                const active = lesson.key === activeLessonKey
                return (
                  <li key={lesson.key}>
                    <Link
                      href={withShare(lessonPath(tutorial, chapter.key, lesson.key), shareToken)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent',
                        active && 'bg-accent font-medium text-accent-foreground',
                      )}
                    >
                      <span>{lesson.title}</span>
                      {lessonStatus[lesson.key] === 'completed' ? (
                        <span className="text-xs text-foreground">
                          <span className="sr-only">Completed: </span>Done
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </details>
        )
      })}
    </nav>
  )
}
