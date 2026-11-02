'use client'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  ItemGroup,
} from '@replo/ui'
import { LoadMore } from '@/components/load-more'
import { LinkButton } from '@/components/link-button'
import { QueryBoundary } from '@/components/query-boundary'
import { pageItems } from '@/lib/paging'
import { RepositoryRow } from './repository-row'
import { useRepositoryList } from './use-repositories'

export function RepositoryList() {
  const repositories = useRepositoryList()

  return (
    <QueryBoundary
      query={repositories}
      errorTitle="We could not load your repositories"
      errorDescription="Check your connection, then try again."
    >
      {(data) => {
        const items = pageItems(data)
        if (items.length === 0) return <NoRepositories />
        return (
          <div className="space-y-2">
            <ItemGroup>
              {items.map((repository) => (
                <RepositoryRow key={repository.repositoryId} repository={repository} />
              ))}
            </ItemGroup>
            <LoadMore query={repositories} />
          </div>
        )
      }}
    </QueryBoundary>
  )
}

function NoRepositories() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No repositories yet</EmptyTitle>
        <EmptyDescription>
          Import a public GitHub repository, or connect the GitHub App for private repos.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <LinkButton href="/import" variant="outline">
          Import a repository
        </LinkButton>
      </EmptyContent>
    </Empty>
  )
}
