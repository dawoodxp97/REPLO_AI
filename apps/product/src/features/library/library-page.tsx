'use client'

import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  ItemGroup,
} from '@replo/ui'
import { useState } from 'react'
import { LinkButton } from '@/components/link-button'
import { LoadMore } from '@/components/load-more'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import {
  applyLibraryFilter,
  DEFAULT_LIBRARY_FILTER,
  isFiltering,
  type LibraryFilter,
} from './library-filter'
import { LibraryToolbar } from './library-toolbar'
import { TutorialRow } from './tutorial-row'
import { useTutorialList } from './use-library'
import { NewTutorialAction } from '@/components/new-tutorial-action'

export function LibraryPage() {
  const list = useTutorialList()
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_LIBRARY_FILTER)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Library"
        description="Your tutorials, who can read them, and how far you have read."
        action={<NewTutorialAction />}
      />

      <QueryBoundary query={list} errorTitle="We could not load your library">
        {(data) => {
          const items = pageItems(data)
          if (items.length === 0) {
            return (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No tutorials yet</EmptyTitle>
                  <EmptyDescription>
                    Generate one from a repository you have imported.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <LinkButton href="/repositories" variant="outline">
                    Go to repositories
                  </LinkButton>
                </EmptyContent>
              </Empty>
            )
          }
          const shown = applyLibraryFilter(items, filter)
          return (
            <div className="space-y-3">
              <LibraryToolbar filter={filter} onChange={setFilter} />
              {shown.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No tutorials match</EmptyTitle>
                    <EmptyDescription>
                      {list.hasNextPage
                        ? 'Only the tutorials loaded so far are filtered. Load more, or clear the filters.'
                        : 'Change or clear the filters to see your tutorials.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={() => setFilter(DEFAULT_LIBRARY_FILTER)}>
                      Clear filters
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <ItemGroup>
                  {shown.map((tutorial) => (
                    <TutorialRow key={tutorial.id} tutorial={tutorial} />
                  ))}
                </ItemGroup>
              )}
              {isFiltering(filter) ? (
                <p role="status" className="text-xs text-muted-foreground">
                  {shown.length} of {items.length} tutorials shown
                </p>
              ) : null}
              <LoadMore query={list} />
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
