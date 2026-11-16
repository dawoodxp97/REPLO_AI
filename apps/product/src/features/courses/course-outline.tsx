import type { CourseOverviewDto } from '@replo/contracts'
import { Item, ItemGroup } from '@replo/ui'
import Link from 'next/link'
import { formatMinutes } from '@/lib/format'
import {
  lessonPath,
  withCourseContext,
  type CourseLinkContext,
  type CourseRef,
} from '@/lib/course-paths'

export type OutlineChapter = CourseOverviewDto['outline'][number]

function chapterMinutes(chapter: OutlineChapter): number {
  return chapter.lessons.reduce((total, lesson) => total + lesson.minutes, 0)
}

export function CourseOutline({
  course,
  chapters,
  linkContext,
}: {
  course: CourseRef
  chapters: readonly OutlineChapter[]
  linkContext: CourseLinkContext
}) {
  return (
    <ol className="space-y-8">
      {chapters.map((chapter) => (
        <li key={chapter.key} className="space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-sm font-semibold tracking-tight">{chapter.title}</h3>
              <p className="tabular font-mono text-xs text-muted-foreground">
                {chapter.lessons.length} {chapter.lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
                {formatMinutes(chapterMinutes(chapter))}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{chapter.summary}</p>
          </div>
          <ItemGroup>
            {chapter.lessons.map((lesson) => (
              <Item key={lesson.key} className="p-0">
                <Link
                  href={withCourseContext(lessonPath(course, chapter.key, lesson.key), linkContext)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:-outline-offset-2"
                >
                  <span className="min-w-0">{lesson.title}</span>
                  <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
                    {formatMinutes(lesson.minutes)}
                  </span>
                </Link>
              </Item>
            ))}
          </ItemGroup>
        </li>
      ))}
    </ol>
  )
}
