import type { OperatorJobDetail } from '@replo/contracts'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import { DescriptionItem } from '@/components/description-item'
import { JobStatusBadge } from '@/features/jobs/job-status-badge'
import { formatDateTime, formatMicros } from '@/lib/format'
import { OperatorLlmCallsTable } from './operator-llm-calls-table'
import { OperatorStagesTable } from './operator-stages-table'

export function OperatorJobDetailView({ detail }: { detail: OperatorJobDetail }) {
  const { job } = detail

  return (
    <div className="space-y-8">
      {job.errorCode ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertTitle className="font-mono">{job.errorCode}</AlertTitle>
          <AlertDescription>
            {job.errorMessage ?? 'No error message was recorded.'}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span className="font-mono text-compact font-normal text-muted-foreground">
              {job.pipeline} pipeline
            </span>
          </CardTitle>
          <CardDescription className="font-mono text-xs break-all">{job.jobId}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
            <DescriptionItem label="Stage" className="font-mono">
              {job.stage ?? '—'}
            </DescriptionItem>
            <DescriptionItem label="Attempts" className="tabular font-mono">
              {job.attempts}
            </DescriptionItem>
            <DescriptionItem label="Progress" className="tabular font-mono">
              {job.progress}%
            </DescriptionItem>
            <DescriptionItem label="Spent" className="tabular font-mono">
              {formatMicros(job.spentMicros)} of {formatMicros(job.budgetMicros)}
            </DescriptionItem>
            <DescriptionItem label="Created">{formatDateTime(job.createdAt)}</DescriptionItem>
            <DescriptionItem label="Finished">
              {job.finishedAt ? formatDateTime(job.finishedAt) : '—'}
            </DescriptionItem>
          </dl>
        </CardContent>
      </Card>

      <OperatorStagesTable stages={detail.stages} />
      <OperatorLlmCallsTable calls={detail.llmCalls} />
    </div>
  )
}
