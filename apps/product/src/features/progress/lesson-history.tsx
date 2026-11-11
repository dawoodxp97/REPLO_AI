'use client'

import type { HistoryEntryDto, TutorialOverviewDto } from '@replo/contracts'
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  Skeleton,
} from '@replo/ui'
import { Check } from 'lucide-react'
import { ErrorPanel } from '@/components/error-panel'
import { LoadMore } from '@/components/load-more'
import { TextLink } from '@/components/text-link'
import { resolveLessonHref } from '@/features/player/lesson-navigation'
import { useUnmarkLesson } from '@/features/player/use-lesson-progress'
import { formatDate } from '@/lib/format'
import {
  createTutorialLinks,
  type TutorialLinkContext,
  type TutorialRef,
} from '@/lib/tutorial-paths'
import { useLessonHistory, type ProgressIds } from './use-progress'

export interface LessonHistoryProps {
  tutorial: TutorialRef
  outline: TutorialOverviewDto['outline']
  ids: ProgressIds
  linkContext: TutorialLinkContext
}

function HistoryRow({
  entry,
  tutorial,
  outline,
  versionId,
  linkContext,
}: {
  entry: HistoryEntryDto
  tutorial: TutorialRef
  outline: TutorialOverviewDto['outline']
  versionId: string
  linkContext: TutorialLinkContext
}) {
  const unmark = useUnmarkLesson()
  const lessonHref = resolveLessonHref(
    outline,
    createTutorialLinks(tutorial, linkContext),
    entry.lessonKey,
  )
  const completed = entry.status === 'completed'

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          {lessonHref ? (
            <TextLink
              href={lessonHref}
              className="pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
            >
              {entry.title}
            </TextLink>
          ) : (
            entry.title
          )}
        </ItemTitle>
        <ItemDescription className="flex items-center gap-1.5">
          {completed ? <Check aria-hidden className="size-3.5 text-observed-text" /> : null}
          <span>
            {completed ? 'Completed' : 'In progress'} on{' '}
            <span className="tabular font-mono">{formatDate(entry.at)}</span>
          </span>
        </ItemDescription>
      </ItemContent>
      {completed ? (
        <ItemActions>
          <Button
            variant="outline"
            size="sm"
            disabled={unmark.isPending}
            onClick={() => unmark.mutate({ versionId, lessonKey: entry.lessonKey })}
          >
            Mark as not complete
          </Button>
        </ItemActions>
      ) : null}
    </Item>
  )
}

export function LessonHistory({ tutorial, outline, ids, linkContext }: LessonHistoryProps) {
  const { query, entries } = useLessonHistory(ids)

  if (query.isPending) return <Skeleton aria-busy="true" className="h-32 w-full" />

  if (query.data === undefined) {
    return (
      <ErrorPanel
        title="The history could not be loaded"
        description="Check your connection, then try again."
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }

  if (entries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No lessons marked yet</EmptyTitle>
          <EmptyDescription>
            Lessons you mark as complete appear here, newest first.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <ItemGroup>
        {entries.map((entry) => (
          <HistoryRow
            key={`${entry.lessonKey}-${entry.at}`}
            entry={entry}
            tutorial={tutorial}
            outline={outline}
            versionId={ids.versionId}
            linkContext={linkContext}
          />
        ))}
      </ItemGroup>
      <LoadMore query={query} />
    </>
  )
}
