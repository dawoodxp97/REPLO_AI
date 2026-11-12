'use client'

import type { TutorialOverviewDto } from '@replo/contracts'
import { Skeleton } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { PageHeader, SectionHeader } from '@/components/page-header'
import { resolveLessonHref } from '@/features/player/lesson/lesson-navigation'
import { useTutorialOverview } from '@/features/player/use-tutorial'
import { formatRepoName } from '@/lib/format'
import {
  createTutorialLinks,
  type TutorialLinkContext,
  type TutorialRef,
} from '@/lib/tutorial-paths'
import { LessonHistory } from './lesson-history'
import { ProgressError } from './progress-error'
import { ProgressSummary } from './progress-summary'
import { useTutorialProgress } from './use-progress'

export function ProgressPage({ tutorial }: { tutorial: TutorialRef }) {
  const { linkContext, overview } = useTutorialOverview(tutorial)

  if (overview.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />

  if (overview.data === undefined) {
    return (
      <ProgressError subject="tutorial" error={overview.error} retry={() => overview.refetch()} />
    )
  }

  return <ProgressView tutorial={tutorial} overview={overview.data} linkContext={linkContext} />
}

function ProgressView({
  tutorial,
  overview,
  linkContext,
}: {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  linkContext: TutorialLinkContext
}) {
  const ids = { tutorialId: overview.tutorial.id, versionId: overview.versionId }
  const progress = useTutorialProgress(ids)

  const header = (
    <PageHeader
      title={overview.tutorial.title}
      description={
        <>
          Your progress in{' '}
          <span className="font-mono">{formatRepoName(tutorial.owner, tutorial.repo)}</span>
        </>
      }
      action={
        <LinkButton href={createTutorialLinks(tutorial, linkContext).overview()} variant="outline">
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
    ? resolveLessonHref(overview.outline, createTutorialLinks(tutorial, linkContext), nextLessonKey)
    : null

  return (
    <div className="space-y-8">
      {header}
      <ProgressSummary progress={progress.data} resumeHref={resumeHref} />
      <section aria-labelledby="history-heading" className="space-y-3">
        <SectionHeader id="history-heading" title="Lesson history" />
        <LessonHistory
          tutorial={tutorial}
          outline={overview.outline}
          ids={ids}
          linkContext={linkContext}
        />
      </section>
    </div>
  )
}
