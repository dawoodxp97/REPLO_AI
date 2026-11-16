'use client'

import type { CourseOverviewDto } from '@replo/contracts'
import { Skeleton } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { PageHeader, SectionHeader } from '@/components/page-header'
import { resolveLessonHref } from '@/features/player/lesson/lesson-navigation'
import { useCourseOverview } from '@/features/player/use-course'
import { formatRepoName } from '@/lib/format'
import { createCourseLinks, type CourseLinkContext, type CourseRef } from '@/lib/course-paths'
import { LessonHistory } from './lesson-history'
import { ProgressError } from './progress-error'
import { ProgressSummary } from './progress-summary'
import { useCourseProgress } from './use-progress'

export function ProgressPage({ course }: { course: CourseRef }) {
  const { linkContext, overview } = useCourseOverview(course)

  if (overview.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />

  if (overview.data === undefined) {
    return (
      <ProgressError subject="course" error={overview.error} retry={() => overview.refetch()} />
    )
  }

  return <ProgressView course={course} overview={overview.data} linkContext={linkContext} />
}

function ProgressView({
  course,
  overview,
  linkContext,
}: {
  course: CourseRef
  overview: CourseOverviewDto
  linkContext: CourseLinkContext
}) {
  const ids = { courseId: overview.course.id, versionId: overview.versionId }
  const progress = useCourseProgress(ids)

  const header = (
    <PageHeader
      title={overview.course.title}
      description={
        <>
          Your progress in{' '}
          <span className="font-mono">{formatRepoName(course.owner, course.repo)}</span>
        </>
      }
      action={
        <LinkButton href={createCourseLinks(course, linkContext).overview()} variant="outline">
          Back to the overview
        </LinkButton>
      }
    />
  )

  if (progress.isPending) {
    return (
      <div className="space-y-8">
        {header}
        <Skeleton aria-busy="true" className="h-40 w-full" />
      </div>
    )
  }

  if (progress.data === undefined) {
    return (
      <div className="space-y-8">
        {header}
        <ProgressError subject="progress" error={progress.error} retry={() => progress.refetch()} />
      </div>
    )
  }

  const { nextLessonKey } = progress.data
  const resumeHref = nextLessonKey
    ? resolveLessonHref(overview.outline, createCourseLinks(course, linkContext), nextLessonKey)
    : null

  return (
    <div className="space-y-8">
      {header}
      <ProgressSummary progress={progress.data} resumeHref={resumeHref} />
      <section aria-labelledby="history-heading" className="space-y-3">
        <SectionHeader id="history-heading" title="Lesson history" />
        <LessonHistory
          course={course}
          outline={overview.outline}
          ids={ids}
          linkContext={linkContext}
        />
      </section>
    </div>
  )
}
