'use client'

import { STAGES, type GenerationJobDto, type Stage } from '@replo/contracts'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  cn,
} from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { apiErrorDetails } from '@/lib/api-error'
import { formatUsd } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { tutorialPath } from '@/lib/tutorial-paths'
import type { Connection, JobProgress, StageState } from './job-progress-state'
import {
  ACTIVE_JOB_STATUSES,
  JOB_STATUS_LABELS,
  RETRYABLE_JOB_STATUSES,
  STAGE_LABELS,
} from './job-status'
import { useCancelJob, useRetryJob } from './use-job-actions'
import { useJobEvents } from './use-job-events'

const POLL_WHILE_DISCONNECTED_MS = 5_000

const CONNECTION_LABELS: Record<Connection, string> = {
  connecting: 'Connecting',
  live: 'Live',
  lost: 'Reconnecting',
}

const STAGE_TEXT: Record<StageState, string> = {
  pending: 'waiting',
  running: 'running',
  done: 'done',
  failed: 'failed',
}

const STAGE_DOT: Record<StageState, string> = {
  pending: 'bg-muted-foreground/30',
  running: 'animate-pulse bg-primary',
  done: 'bg-observed',
  failed: 'bg-destructive',
}

export function JobPage({ jobId }: { jobId: string }) {
  const progress = useJobEvents(jobId)
  const job = useQuery(
    orpc.jobs.get.queryOptions({
      input: { jobId },
      refetchInterval: progress.connection === 'live' ? false : POLL_WHILE_DISCONNECTED_MS,
    }),
  )

  if (job.isPending) return <Skeleton aria-busy="true" className="h-64 w-full" />

  if (job.isError) {
    return (
      <ErrorPanel
        title="We could not load this job"
        description="Check your connection, then reload this page."
      />
    )
  }

  return (
    <div className="space-y-6">
      <JobSummary job={job.data} connection={progress.connection} />
      <StageList stages={progress.stages} />
      <JobOutcome job={job.data} progress={progress} />
      <JobActions job={job.data} />
    </div>
  )
}

function JobSummary({ job, connection }: { job: GenerationJobDto; connection: Connection }) {
  const connectionVariant =
    connection === 'live' ? 'observed' : connection === 'lost' ? 'interpretation' : 'neutral'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge>{JOB_STATUS_LABELS[job.status]}</Badge>
        <span className="text-muted-foreground">
          Spent {formatUsd(job.spentUsd)} of {formatUsd(job.budgetUsd)}
        </span>
      </div>
      <Badge variant={connectionVariant} aria-live="polite">
        {CONNECTION_LABELS[connection]}
      </Badge>
    </div>
  )
}

function StageList({ stages }: { stages: Record<Stage, StageState> }) {
  return (
    <ol className="space-y-2">
      {STAGES.map((stage) => (
        <li
          key={stage}
          className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm"
        >
          <span aria-hidden className={cn('size-2.5 rounded-full', STAGE_DOT[stages[stage]])} />
          <span className="flex-1">{STAGE_LABELS[stage]}</span>
          <span className="text-xs text-muted-foreground">{STAGE_TEXT[stages[stage]]}</span>
        </li>
      ))}
    </ol>
  )
}

function JobOutcome({ job, progress }: { job: GenerationJobDto; progress: JobProgress }) {
  if (job.status === 'succeeded') return <TutorialReady tutorialId={job.tutorialId} />

  if (job.status === 'failed') {
    return (
      <Alert tone="destructive" role="alert">
        <p>The job stopped before the tutorial was published.</p>
        {job.error ? <p className="mt-1 font-mono text-xs">Error code: {job.error.code}</p> : null}
      </Alert>
    )
  }

  if (job.status === 'canceled' || progress.terminal === 'canceled') {
    return (
      <p className="text-sm text-muted-foreground">
        This job was canceled. No further key spend will happen.
      </p>
    )
  }

  return null
}

function TutorialReady({ tutorialId }: { tutorialId: string | null }) {
  const tutorials = useQuery(
    orpc.tutorials.list.queryOptions({ input: { limit: 100 }, enabled: tutorialId !== null }),
  )
  const tutorial = tutorials.data?.items.find((item) => item.id === tutorialId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tutorial ready</CardTitle>
        <CardDescription>Every explanation links to the code it came from.</CardDescription>
      </CardHeader>
      {tutorial ? (
        <CardContent className="flex flex-wrap gap-3">
          <LinkButton href={tutorialPath(tutorial)}>Open the tutorial</LinkButton>
        </CardContent>
      ) : null}
    </Card>
  )
}

function JobActions({ job }: { job: GenerationJobDto }) {
  const cancel = useCancelJob(job.jobId)
  const retry = useRetryJob(job.jobId)
  const canCancel = ACTIVE_JOB_STATUSES.includes(job.status)
  const canRetry = RETRYABLE_JOB_STATUSES.includes(job.status)
  const failure = cancel.error ?? retry.error

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {canCancel ? (
          <Button
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ jobId: job.jobId })}
          >
            {cancel.isPending ? 'Canceling…' : 'Cancel generation'}
          </Button>
        ) : null}
        {canRetry ? (
          <Button disabled={retry.isPending} onClick={() => retry.mutate({ jobId: job.jobId })}>
            {retry.isPending ? 'Retrying…' : 'Retry from the last checkpoint'}
          </Button>
        ) : null}
      </div>
      {failure ? (
        <Alert tone="destructive" role="alert">
          {describeJobActionError(failure)}
        </Alert>
      ) : null}
    </div>
  )
}

function describeJobActionError(error: unknown): string {
  const details = apiErrorDetails(error)
  if (details?.code === 'CONFLICT') return 'This job is not in a state that allows that action.'
  return 'Something went wrong. Try again.'
}
