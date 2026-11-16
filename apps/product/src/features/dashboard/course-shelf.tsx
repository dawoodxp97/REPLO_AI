'use client'

import type { CourseSummaryDto } from '@replo/contracts'
import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import { SectionHeader } from '@/components/page-header'
import { ReadProgress } from '@/features/library/read-progress'
import { useCourseList } from '@/features/library/use-library'
import { formatRepoName } from '@/lib/format'
import { pageItems } from '@/lib/paging'
import { coursePath } from '@/lib/course-paths'

const SHELF_SIZE = 4

function CourseCard({ course }: { course: CourseSummaryDto }) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={coursePath(course)}
            className="font-medium break-words hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {course.title}
          </Link>
        </div>
        <p className="font-mono text-xs break-all text-muted-foreground">
          {formatRepoName(course.owner, course.repo)} · v{course.currentVersionNo}
        </p>
      </div>
      <ReadProgress ratio={course.progress} className="w-full flex-1" />
    </li>
  )
}

export function CourseShelf() {
  const courses = useCourseList()
  const shelf = pageItems(courses.data).slice(0, SHELF_SIZE)
  if (shelf.length === 0) return null

  return (
    <section aria-labelledby="shelf-heading" className="space-y-3">
      <SectionHeader
        id="shelf-heading"
        title="Your courses"
        action={
          <LinkButton href="/library" variant="ghost" size="sm">
            View library
          </LinkButton>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {shelf.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </ul>
    </section>
  )
}
