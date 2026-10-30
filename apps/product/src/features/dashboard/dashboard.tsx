'use client'

import {
  Badge,
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
import { useMemo } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { JOB_STATUS_LABELS } from '@/features/jobs/job-status'
import { RecommendedKeyNote } from '@/features/keys/recommended-key-note'
import { orpc } from '@/lib/orpc'
import { tutorialPath } from '@/lib/tutorial-paths'

const NO_CURSOR: string | undefined = undefined

export function Dashboard() {
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const summary = useQuery(orpc.dashboard.summary.queryOptions({ input: { tz: timeZone } }))
  const recent = useInfiniteQuery(
    orpc.dashboard.recent.infiniteOptions({
      input: (cursor) => ({ tz: timeZone, limit: 10, cursor }),
      initialPageParam: NO_CURSOR,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Pick up where you left off, or start a tutorial for a new repository."
        action={
          <LinkButton href="/import" size="lg">
            Import a repository
          </LinkButton>
        }
      />

      {summary.isPending ? (
        <Skeleton aria-busy="true" className="h-40 w-full" />
      ) : summary.isError || !summary.data ? (
        <ErrorPanel
          title="We could not load your home"
          description="Check your connection, then reload."
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <CountTile label="Tutorials" value={summary.data.counts.total} />
            <CountTile label="Drafts" value={summary.data.counts.draft} />
            <CountTile label="Private" value={summary.data.counts.private} />
            <CountTile label="By link" value={summary.data.counts.link} />
            <CountTile label="Public" value={summary.data.counts.public} />
          </dl>

          {summary.data.resume ? (
            <Card>
              <CardHeader>
                <CardDescription>Continue reading</CardDescription>
                <CardTitle>{summary.data.resume.lessonTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <LinkButton href={`${tutorialPath(summary.data.resume)}?resume`} variant="outline">
                  Resume
                </LinkButton>
              </CardContent>
            </Card>
          ) : null}

          {summary.data.jobsInFlight.length > 0 ? (
            <section aria-labelledby="in-flight-heading" className="space-y-3">
              <h2 id="in-flight-heading" className="font-serif text-2xl font-medium">
                In progress
              </h2>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {summary.data.jobsInFlight.map((job) => (
                  <li
                    key={job.jobId}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="font-mono">
                      {job.owner}/{job.repo}
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge>{JOB_STATUS_LABELS[job.status]}</Badge>
                      <Link
                        href={`/jobs/${job.jobId}`}
                        className="text-primary underline underline-offset-4"
                      >
                        View job
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {summary.data.counts.total === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No tutorials yet</CardTitle>
                <CardDescription>
                  Import a GitHub repository to start one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RecommendedKeyNote />
                <LinkButton href="/settings/keys" variant="outline">
                  Manage keys
                </LinkButton>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="font-serif text-2xl font-medium">
          Recent activity
        </h2>
        {recent.isPending ? (
          <Skeleton aria-busy="true" className="h-24 w-full" />
        ) : recent.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Recent activity could not be loaded.
          </p>
        ) : recent.data && recent.data.pages.some((page) => page.items.length > 0) ? (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {recent.data.pages
              .flatMap((page) => page.items)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span>{item.title}</span>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    {item.localDate}
                    {item.link ? (
                      <Link href={item.link} className="text-primary underline underline-offset-4">
                        Open
                      </Link>
                    ) : null}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing yet. Activity appears here as you import and read.
          </p>
        )}
        {recent.hasNextPage ? (
          <Button
            variant="outline"
            disabled={recent.isFetchingNextPage}
            onClick={() => void recent.fetchNextPage()}
          >
            {recent.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </section>
    </div>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-serif text-3xl font-medium">{value}</dd>
    </div>
  )
}
