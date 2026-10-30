'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@replo/ui'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { orpc } from '@/lib/orpc'
import { RepositoryRow } from './repository-row'

const PAGE_SIZE = 25
const FIRST_PAGE: string | undefined = undefined

export function MyRepositories() {
  const repositories = useInfiniteQuery(
    orpc.repositories.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }),
  )

  const items = repositories.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repositories"
        description="Repositories you have imported, with the state of their latest tutorial job."
        action={<LinkButton href="/import">Import a repository</LinkButton>}
      />

      {repositories.isPending ? (
        <Skeleton aria-busy="true" className="h-40 w-full" />
      ) : repositories.isError ? (
        <ErrorPanel
          title="We could not load your repositories"
          description="Check your connection, then reload this page."
        />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No repositories yet</CardTitle>
            <CardDescription>
              Import a public GitHub repository, or connect the GitHub App for private repos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href="/import" variant="outline">
              Import a repository
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((repository) => (
            <RepositoryRow key={repository.repositoryId} repository={repository} />
          ))}
        </ul>
      )}

      {repositories.hasNextPage ? (
        <Button
          variant="outline"
          disabled={repositories.isFetchingNextPage}
          onClick={() => void repositories.fetchNextPage()}
        >
          {repositories.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}
