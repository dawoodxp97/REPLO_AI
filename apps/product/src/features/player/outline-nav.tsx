import type { LessonStatus, TutorialOverviewDto } from '@replo/contracts'
import { cn } from '@replo/ui'
import { Check, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { TutorialLinks } from '@/lib/tutorial-paths'

export interface OutlineNavProps {
  links: TutorialLinks
  outline: TutorialOverviewDto['outline']
  activeLessonKey: string
  lessonStatus: Readonly<Record<string, LessonStatus | undefined>>
}

export function OutlineNav({ links, outline, activeLessonKey, lessonStatus }: OutlineNavProps) {
  return (
    <nav aria-label="Lessons" className="space-y-1 text-sm">
      {outline.map((chapter) => {
        const containsActive = chapter.lessons.some((lesson) => lesson.key === activeLessonKey)
        return (
          <details key={chapter.key} open={containsActive} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1.5 font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
              <span className="min-w-0">{chapter.title}</span>
            </summary>
            <ul className="mt-0.5 ml-3.5 space-y-0.5 border-l pl-2">
              {chapter.lessons.map((lesson) => {
                const active = lesson.key === activeLessonKey
                return (
                  <li key={lesson.key}>
                    <Link
                      href={links.lesson({ chapterKey: chapter.key, lessonKey: lesson.key })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40',
                        active && 'bg-accent font-medium text-foreground',
                      )}
                    >
                      <span className="min-w-0">{lesson.title}</span>
                      {lessonStatus[lesson.key] === 'completed' ? (
                        <>
                          <Check className="size-4 shrink-0 text-observed-text" />
                          <span className="sr-only">Completed</span>
                        </>
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
