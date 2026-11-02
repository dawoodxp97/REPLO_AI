'use client'

import { skipToken } from '@tanstack/react-query'
import { useTutorialProgress } from '@/features/progress/use-progress'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { LessonScreen } from './lesson-screen'
import { useChapter } from './use-chapter'
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
  const chapter = useChapter(versionId, chapterKey, shareToken)
  const progress = useTutorialProgress(
    overview.data === undefined
      ? skipToken
      : { tutorialId: overview.data.tutorial.id, versionId: overview.data.versionId },
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
      chapterData={chapter.data}
      lesson={lesson}
      progress={progress.data}
      shareToken={shareToken}
      version={versionNo}
    />
  )
}
