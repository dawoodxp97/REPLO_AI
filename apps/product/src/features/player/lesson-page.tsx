'use client'

import { skipToken, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { LessonScreen } from './lesson-screen'
import { PageSkeleton, UnavailablePanel } from './tutorial-states'
import { useTutorialOverview } from './use-tutorial-overview'

export interface LessonPageProps {
  tutorial: TutorialRef
  chapterKey: string
  lessonKey: string
}

export function LessonPage({ tutorial, chapterKey, lessonKey }: LessonPageProps) {
  const { shareToken, versionNo, overview } = useTutorialOverview(tutorial)
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

  if (overview.isPending || (versionId !== undefined && chapter.isPending)) return <PageSkeleton />

  const lesson = chapter.data?.chapter.lessons.find((item) => item.key === lessonKey)
  if (!overview.data || !chapter.data || !lesson) {
    return (
      <UnavailablePanel
        title="This lesson is not available"
        description="Check the link, or open the tutorial overview to choose a lesson."
      />
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
      version={versionNo}
    />
  )
}
