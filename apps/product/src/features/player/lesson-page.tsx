'use client'

import { Skeleton } from '@replo/ui'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { ErrorPanel } from '@/components/error-panel'
import { orpc } from '@/lib/orpc'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { LessonScreen } from './lesson-screen'

export interface LessonPageProps {
  tutorial: TutorialRef
  chapterKey: string
  lessonKey: string
}

export function LessonPage({ tutorial, chapterKey, lessonKey }: LessonPageProps) {
  const shareToken = useSearchParams().get('share') ?? undefined
  const overview = useQuery(orpc.tutorials.get.queryOptions({ input: { ...tutorial, shareToken } }))
  const versionId = overview.data?.versionId
  const chapter = useQuery(
    orpc.tutorials.getChapter.queryOptions({
      input: versionId === undefined ? skipToken : { versionId, chapterKey, shareToken },
    }),
  )
  const progress = useQuery(
    orpc.learning.getProgress.queryOptions({
      input:
        overview.data === undefined
          ? skipToken
          : { tutorialId: overview.data.tutorial.id, versionId: overview.data.versionId },
    }),
  )

  if (overview.isPending || chapter.isPending) {
    return <Skeleton aria-busy="true" className="m-4 h-96 w-[calc(100%-2rem)]" />
  }

  const lesson = chapter.data?.chapter.lessons.find((item) => item.key === lessonKey)
  if (overview.isError || chapter.isError || !overview.data || !chapter.data || !lesson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorPanel
          title="This lesson is not available"
          description="Check the link, or open the tutorial overview to choose a lesson."
        />
      </div>
    )
  }

  return (
    <LessonScreen
      tutorial={tutorial}
      overview={overview.data}
      chapter={chapter.data}
      lesson={lesson}
      progress={progress.data}
      shareToken={shareToken}
    />
  )
}
