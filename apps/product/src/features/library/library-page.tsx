'use client'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  ItemGroup,
} from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { LoadMore } from '@/components/load-more'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import { TutorialRow } from './tutorial-row'
import { useTutorialList } from './use-library'

export function LibraryPage() {
  const list = useTutorialList()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Library"
        description="Your tutorials, who can read them, and how far you have read."
        action={<LinkButton href="/import">Generate a tutorial</LinkButton>}
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
          return (
            <div className="space-y-3">
              <ItemGroup>
                {items.map((tutorial) => (
                  <TutorialRow key={tutorial.id} tutorial={tutorial} />
                ))}
              </ItemGroup>
              <LoadMore query={list} />
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
