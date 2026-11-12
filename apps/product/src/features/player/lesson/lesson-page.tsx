'use client'

import { Skeleton } from '@replo/ui'
import { skipToken, useQuery } from '@tanstack/react-query'
import { ErrorPanel } from '@/components/error-panel'
import { useTutorialProgress } from '@/features/progress/use-progress'
import { orpc } from '@/lib/orpc'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { useTutorialOverview } from '../use-tutorial'
import { LessonScreen } from './lesson-screen'

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

function useChapter(
  versionId: string | undefined,
  chapterKey: string,
  shareToken: string | undefined,
) {
  return useQuery(
    orpc.tutorials.getChapter.queryOptions({
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
