import type { OperatorJobRow } from '@replo/contracts'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, Progress } from '@replo/ui'
import Link from 'next/link'
import { DataTable, type DataColumn } from '@/components/data-table'
import { LinkButton } from '@/components/link-button'
import { JobStatusBadge } from '@/features/jobs/job-status-badge'
import { formatDateTime, formatMicros } from '@/lib/format'

const COLUMNS: readonly DataColumn<OperatorJobRow>[] = [
  {
    header: 'Job',
    cell: (row) => (
      <Link href={`/operator/jobs/${row.jobId}`} className="text-link underline underline-offset-4">
        {row.jobId.slice(0, 8)}
      </Link>
    ),
    className: 'font-mono text-xs',
  },
  { header: 'Status', cell: (row) => <JobStatusBadge status={row.status} /> },
  { header: 'Stage', cell: (row) => row.stage ?? '—', className: 'font-mono text-xs' },
  { header: 'Pipeline', cell: (row) => row.pipeline, className: 'font-mono text-xs' },
  {
    header: 'Progress',
    cell: (row) => (
      <div className="flex items-center gap-2">
        <Progress value={row.progress} aria-label="Job progress" className="w-16" />
        <span className="tabular w-9 text-right text-xs text-muted-foreground">
          {row.progress}%
        </span>
      </div>
    ),
  },
  {
    header: 'Spent',
    cell: (row) => `${formatMicros(row.spentMicros)} of ${formatMicros(row.budgetMicros)}`,
    className: 'tabular font-mono text-xs whitespace-nowrap',
  },
  {
    header: 'Created',
    cell: (row) => formatDateTime(row.createdAt),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
]

export function OperatorJobsTable({
  rows,
  nextCursor,
}: {
  rows: readonly OperatorJobRow[]
  nextCursor: string | null
}) {
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No jobs yet</EmptyTitle>
          <EmptyDescription>
            Generation jobs appear here as soon as someone starts one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <DataTable columns={COLUMNS} rows={rows} getKey={(row) => row.jobId} minWidth="min-w-3xl" />
      {nextCursor ? (
        <LinkButton
          href={`/operator?cursor=${encodeURIComponent(nextCursor)}`}
          variant="outline"
          size="sm"
        >
          Next page
        </LinkButton>
      ) : null}
    </div>
  )
}
