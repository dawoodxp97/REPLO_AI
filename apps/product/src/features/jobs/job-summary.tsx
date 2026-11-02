import type { GenerationJobDto } from '@replo/contracts'
import { Card, CardContent, Progress } from '@replo/ui'
import { formatUsd } from '@/lib/format'
import { ConnectionStatus } from './connection-status'
import { JobStatusBadge } from './job-status-badge'
import type { Connection } from './job-progress-state'

export function JobSummary({ job, connection }: { job: GenerationJobDto; connection: Connection }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <JobStatusBadge status={job.status} />
            <span className="font-mono text-xs text-muted-foreground" title={job.commitSha}>
              {job.commitSha.slice(0, 7)}
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">
              Spent <span className="tabular font-mono">{formatUsd(job.spentUsd)}</span> of{' '}
              <span className="tabular font-mono">{formatUsd(job.budgetUsd)}</span>
            </span>
          </div>
          <ConnectionStatus connection={connection} />
        </div>
        <Progress value={job.progress} aria-label="Overall progress" />
      </CardContent>
    </Card>
  )
}
