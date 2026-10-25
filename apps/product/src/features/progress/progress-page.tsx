'use client'

import type { TutorialOverviewDto } from '@replo/contracts'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@replo/ui'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ErrorPanel } from '@/components/error-panel'
import { findChapterKey } from '@/features/player/lesson-navigation'
import { useUnmarkLesson } from '@/features/player/use-lesson-progress'
import { withShare } from '@/features/tutorials/tutorial-outline'
import { orpc } from '@/lib/orpc'
import { lessonPath, tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'

const HISTORY_PAGE_SIZE = 25
const NO_CURSOR: string | undefined = undefined

export function ProgressPage({ tutorial }: { tutorial: TutorialRef }) {
  const shareToken = useSearchParams().get('share') ?? undefined
  const overview = useQuery(orpc.tutorials.get.queryOptions({ input: { ...tutorial, shareToken } }))

  if (overview.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />

  if (overview.isError || !overview.data) {
    return (
      <ErrorPanel
        title="This tutorial is not available"
        description="Check the link, or return to the tutorial overview."
      />
    )
  }

  return <ProgressView tutorial={tutorial} overview={overview.data} shareToken={shareToken} />
}

function ProgressView({
  tutorial,
  overview,
  shareToken,
}: {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  shareToken: string | undefined
}) {
  const ids = { tutorialId: overview.tutorial.id, versionId: overview.versionId }
  const progress = useQuery(orpc.learning.getProgress.queryOptions({ input: ids }))
  const history = useInfiniteQuery(
    orpc.learning.history.infiniteOptions({
      input: (cursor) => ({ ...ids, limit: HISTORY_PAGE_SIZE, cursor }),
      initialPageParam: NO_CURSOR,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
  )
  const unmark = useUnmarkLesson()

  if (progress.isPending) return <Skeleton aria-busy="true" className="h-40 w-full" />
  if (progress.isError || !progress.data) {
    return (
      <ErrorPanel
        title="Sign in to see your progress"
        description="Progress is saved to your account for each tutorial."
      />
    )
  }

  const resumeChapter = progress.data.nextLessonKey
    ? findChapterKey(overview.outline, progress.data.nextLessonKey)
    : undefined
  const resumeHref =
    progress.data.nextLessonKey && resumeChapter
      ? withShare(lessonPath(tutorial, resumeChapter, progress.data.nextLessonKey), shareToken)
      : null
  const items = history.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        {overview.tutorial.title}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>
            {progress.data.completed} of {progress.data.total} lessons complete
          </CardTitle>
          <CardDescription>
            Progress is kept for this version. Regenerating the tutorial keeps it for lessons that
            did not change.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <progress
            value={progress.data.completed}
            max={Math.max(progress.data.total, 1)}
            aria-label="Lessons complete"
            className="h-2 w-full appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary"
          />
          <div className="flex flex-wrap gap-3">
            {resumeHref ? (
              <Link
                href={resumeHref}
                className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Resume reading
              </Link>
            ) : null}
            <Link
              href={withShare(tutorialPath(tutorial), shareToken)}
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:bg-accent"
            >
              Back to the overview
            </Link>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="history-heading" className="space-y-3">
        <h2 id="history-heading" className="font-serif text-2xl font-medium">
          Lesson history
        </h2>
        {history.isPending ? (
          <Skeleton aria-busy="true" className="h-32 w-full" />
        ) : history.isError ? (
          <Alert tone="destructive" role="alert">
            The history could not be loaded.
          </Alert>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons have been marked yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {items.map((entry) => {
              const chapterKey = findChapterKey(overview.outline, entry.lessonKey)
              return (
                <li
                  key={`${entry.lessonKey}-${entry.at}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    {chapterKey ? (
                      <Link
                        href={withShare(
                          lessonPath(tutorial, chapterKey, entry.lessonKey),
                          shareToken,
                        )}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {entry.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{entry.title}</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {entry.status === 'completed' ? 'Completed' : 'In progress'} on{' '}
                      {entry.at.slice(0, 10)}
                    </p>
                  </div>
                  {entry.status === 'completed' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={unmark.isPending}
                      onClick={() =>
                        unmark.mutate({ versionId: overview.versionId, lessonKey: entry.lessonKey })
                      }
                    >
                      Mark as not complete
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        {history.hasNextPage ? (
          <Button
            variant="outline"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </section>
    </div>
  )
}
