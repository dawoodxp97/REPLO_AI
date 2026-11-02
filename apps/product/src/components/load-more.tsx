import { Button, Spinner } from '@replo/ui'

export interface InfiniteQueryLike {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  fetchNextPage: () => unknown
}

export function LoadMore({
  query,
  label = 'Load more',
}: {
  query: InfiniteQueryLike
  label?: string
}) {
  if (!query.hasNextPage) return null
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={query.isFetchingNextPage}
        onClick={() => void query.fetchNextPage()}
      >
        {query.isFetchingNextPage ? <Spinner /> : null}
        {query.isFetchingNextPage ? 'Loading…' : query.isFetchNextPageError ? 'Try again' : label}
      </Button>
      {query.isFetchNextPageError ? (
        <p role="alert" className="text-xs text-destructive">
          More items could not be loaded.
        </p>
      ) : null}
    </div>
  )
}
