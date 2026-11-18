'use client'

import type { GenerationJobDto } from '@replo/contracts'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  Progress,
  Skeleton,
} from '@replo/ui'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { formatRepoName } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { useCancelJob } from './use-job'
import { formatElapsed } from './format-elapsed'
import { STAGE_LABELS, JOB_STATUS_LABELS, canCancelJob } from './job-status'

const REFRESH_MS = 5_000

export function ActiveGenerations() {
  const active = useQuery(
    orpc.jobs.listActive.queryOptions({
      refetchInterval: REFRESH_MS,
      refetchIntervalInBackground: true,
    }),
  )

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Generations"
        description="Everything running on your key right now, with the stage it is in and how long it has taken."
        action={<LinkButton href="/repositories">All repositories</LinkButton>}
      />
      <QueryBoundary
        query={active}
        errorTitle="We could not load your generations"
        errorDescription="Check your connection, then try again."
        loading={<Skeleton aria-busy="true" className="h-40 w-full" />}
      >
        {(jobs) =>
          jobs.length === 0 ? (
            <NoGenerations />
          ) : (
            <ItemGroup>
              {jobs.map((job) => (
                <GenerationRow key={job.jobId} job={job} />
              ))}
            </ItemGroup>
          )
        }
      </QueryBoundary>
    </div>
  )
}

function GenerationRow({ job }: { job: GenerationJobDto }) {
  const queryClient = useQueryClient()
  const cancel = useCancelJob(job.jobId)
  const [now, setNow] = useState<number | null>(null)
  const name = job.repository
    ? formatRepoName(job.repository.owner, job.repository.name)
    : 'Repository'
  const stage = job.stage ? STAGE_LABELS[job.stage] : 'Waiting to start'
  const elapsed = now === null ? '—' : formatElapsed(now - Date.parse(job.createdAt))

  useEffect(() => {
    const update = () => setNow(Date.now())
    update()
    const timer = setInterval(update, 1_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <Item>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <Link
            href={`/jobs/${job.jobId}`}
            className="font-mono break-all hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {name}
          </Link>
        </ItemTitle>
        <ItemDescription className="text-xs">
          {JOB_STATUS_LABELS[job.status]} · {stage}
          <span className="tabular font-mono">
            {' '}
            · {job.progress}% · {elapsed}
          </span>
        </ItemDescription>
        <Progress
          value={job.progress}
          aria-label={`Progress for ${name}`}
          className="h-1 max-w-sm"
        />
      </ItemContent>
      <ItemActions className="flex-wrap">
        <LinkButton href={`/jobs/${job.jobId}`} variant="outline" size="sm">
          Open
        </LinkButton>
        {canCancelJob(job.status) ? (
          <ConfirmDialog
            triggerLabel="Cancel"
            triggerVariant="destructive-outline"
            title={`Stop generating ${name}?`}
            description="The run stops after the current step. You can retry later from the last finished stage."
            confirmLabel="Stop generation"
            run={async () => {
              await cancel.mutateAsync({ jobId: job.jobId })
              await queryClient.invalidateQueries({ queryKey: orpc.jobs.listActive.key() })
            }}
            describeError={() => 'The generation could not be canceled. Try again.'}
          />
        ) : null}
      </ItemActions>
    </Item>
  )
}

function NoGenerations() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Nothing is generating</EmptyTitle>
        <EmptyDescription>
          New generations appear here while they run, with their stage and progress.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <LinkButton href="/import" variant="outline">
          Start a course
        </LinkButton>
      </EmptyContent>
    </Empty>
  )
}
