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
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { useTutorialList } from './use-library'
import { TutorialRow } from './tutorial-row'

export function LibraryPage() {
  const list = useTutorialList()
  const items = list.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library"
        description="Your tutorials, who can read them, and how far you have read."
        action={<LinkButton href="/import">Generate a tutorial</LinkButton>}
      />

      {list.isPending ? (
        <Skeleton aria-busy="true" className="h-48 w-full" />
      ) : list.isError ? (
        <ErrorPanel
          title="We could not load your library"
          description="Check your connection, then reload this page."
        />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tutorials yet</CardTitle>
            <CardDescription>Generate one from a repository you have imported.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href="/repositories" variant="outline">
              Go to repositories
            </LinkButton>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((tutorial) => (
            <TutorialRow key={tutorial.id} tutorial={tutorial} />
          ))}
        </ul>
      )}

      {list.hasNextPage ? (
        <Button
          variant="outline"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  )
}
