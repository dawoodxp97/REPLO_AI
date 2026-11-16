import type { CourseSummaryDto } from '@replo/contracts'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@replo/ui'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatDate, formatRepoName } from '@/lib/format'
import { coursePath } from '@/lib/course-paths'
import { ReadProgress } from './read-progress'
import { useDeleteCourse } from './use-library'

export function CourseRow({ course }: { course: CourseSummaryDto }) {
  const remove = useDeleteCourse()

  return (
    <Item>
      <ItemContent className="basis-full sm:basis-0">
        <ItemTitle>
          <Link
            href={coursePath(course)}
            className="break-words hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {course.title}
          </Link>
        </ItemTitle>
        <ItemDescription className="font-mono text-xs">
          {formatRepoName(course.owner, course.repo)} · v{course.currentVersionNo} · updated{' '}
          {formatDate(course.updatedAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="max-w-full flex-wrap">
        {course.progress === null ? null : <ReadProgress ratio={course.progress} />}
        <ConfirmDialog
          triggerLabel="Delete"
          title="Delete this course?"
          description="Its versions and your progress are deleted."
          confirmLabel="Delete course"
          run={() => remove.mutateAsync({ courseId: course.id })}
          describeError={() => 'The course could not be deleted. Try again.'}
        />
      </ItemActions>
    </Item>
  )
}
