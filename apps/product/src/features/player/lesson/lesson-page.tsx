'use client'

import { Skeleton } from '@replo/ui'
import { skipToken, useQuery } from '@tanstack/react-query'
import { ErrorPanel } from '@/components/error-panel'
import { useCourseProgress } from '@/features/progress/use-progress'
import { orpc } from '@/lib/orpc'
import type { CourseRef } from '@/lib/course-paths'
import { useCourseOverview } from '../use-course'
import { LessonScreen } from './lesson-screen'

export interface LessonPageProps {
  course: CourseRef
  chapterKey: string
  lessonKey: string
}

export function LessonPage({ course, chapterKey, lessonKey }: LessonPageProps) {
  const { shareToken, versionNo, overview } = useCourseOverview(course)
  const versionId = overview.data?.versionId
  const chapter = useChapter(versionId, chapterKey, shareToken)
  const progress = useCourseProgress(
    overview.data === undefined
      ? skipToken
      : { courseId: overview.data.course.id, versionId: overview.data.versionId },
  )

  if (overview.isPending || (versionId !== undefined && chapter.isPending)) return <PageSkeleton />

  const lesson = chapter.data?.chapter.lessons.find((item) => item.key === lessonKey)
  if (!overview.data || !chapter.data || !lesson) {
    return (
      <UnavailablePanel
        title="This lesson is not available"
        description="Check the link, or open the course overview to choose a lesson."
      />
    )
  }

  return (
    <LessonScreen
      course={course}
      overview={overview.data}
      chapterData={chapter.data}
      lesson={lesson}
      progress={progress.data}
      shareToken={shareToken}
      version={versionNo}
    />
  )
}

function useChapter(
  versionId: string | undefined,
  chapterKey: string,
  shareToken: string | undefined,
) {
  return useQuery(
    orpc.courses.getChapter.queryOptions({
      input: versionId === undefined ? skipToken : { versionId, chapterKey, shareToken },
    }),
  )
}

function PageSkeleton() {
  return <Skeleton aria-busy="true" className="m-4 h-96 w-[calc(100%-2rem)]" />
}

function UnavailablePanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <ErrorPanel title={title} description={description} />
    </div>
  )
}
