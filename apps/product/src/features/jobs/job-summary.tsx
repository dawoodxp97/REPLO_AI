import type { GenerationJobDto } from '@replo/contracts'
import type { ReactNode } from 'react'
import { Card, CardContent, Progress } from '@replo/ui'
import { formatUsd, shortSha } from '@/lib/format'
import { ConnectionStatus } from './connection-status'
import { JobStatusBadge } from './job-status-badge'
import { stageLine } from './job-heading'
import type { JobProgress } from './job-progress-state'

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
