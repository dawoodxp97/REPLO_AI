import type { GenerationJobDto } from '@replo/contracts'
import type { ReactNode } from 'react'
import { Card, CardContent, cn, Progress } from '@replo/ui'
import { formatUsd, shortSha } from '@/lib/format'
import { JobStatusBadge } from './job-status-badge'
import { stageLine } from './job-heading'
import type { Connection, JobProgress } from './job-progress-state'
import { CONNECTION_LABELS } from './job-status'

export function JobSummary({
  job,
  progress,
  actions,
}: {
  job: GenerationJobDto
  progress: JobProgress
  actions: ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <JobStatusBadge status={job.status} />
            <span className="font-mono text-xs text-muted-foreground" title={job.commitSha}>
              {shortSha(job.commitSha)}
            </span>
            <span className="text-compact text-muted-foreground">
              Spent <span className="tabular font-mono">{formatUsd(job.spentUsd)}</span> of{' '}
              <span className="tabular font-mono">{formatUsd(job.budgetUsd)}</span>
            </span>
          </div>
          <ConnectionStatus connection={progress.connection} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium" aria-live="polite">
            {stageLine(progress, job)}
          </p>
          <Progress value={job.progress} aria-label="Overall progress" />
        </div>
        {actions}
      </CardContent>
    </Card>
  )
}

const DOT: Record<Connection, string> = {
  connecting: 'bg-muted-foreground/40',
  live: 'bg-observed',
  lost: 'bg-interpretation',
  closed: 'bg-muted-foreground/40',
}

const TEXT: Record<Connection, string> = {
  connecting: 'text-muted-foreground',
  live: 'text-observed-text',
  lost: 'text-interpretation-text',
  closed: 'text-muted-foreground',
}

function ConnectionStatus({ connection }: { connection: Connection }) {
  return (
    <span
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TEXT[connection])}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[connection])} />
      {CONNECTION_LABELS[connection]}
    </span>
  )
}
