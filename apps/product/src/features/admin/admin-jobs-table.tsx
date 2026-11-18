import type { AdminJobRow } from '@replo/contracts'
import { Badge, Empty, EmptyDescription, EmptyHeader, EmptyTitle, Progress } from '@replo/ui'
import Link from 'next/link'
import { DataTable, type DataColumn } from '@/components/data-table'
import { JobStatusBadge } from '@/features/jobs/job-status-badge'
import { formatDateTime } from '@/lib/format'

const COLUMNS: readonly DataColumn<AdminJobRow>[] = [
  {
    header: 'Job',
    cell: (row) => (
      <Link
        href={`/admin/jobs/${row.jobId}`}
        className="text-link inline-flex min-h-6 items-center underline underline-offset-4 pointer-coarse:min-h-10"
      >
        {row.jobId.slice(0, 8)}
      </Link>
    ),
    className: 'font-mono text-xs',
  },
  { header: 'Status', cell: (row) => <JobStatusBadge status={row.status} /> },
  { header: 'Stage', cell: (row) => row.stage ?? '—', className: 'font-mono text-xs' },
  { header: 'Pipeline', cell: (row) => row.pipeline, className: 'font-mono text-xs' },
  {
    header: 'Error',
    cell: (row) =>
      row.errorCode ? <Badge variant="destructive">{row.errorCode}</Badge> : <span>—</span>,
  },
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
    header: 'Created',
    cell: (row) => formatDateTime(row.createdAt),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
]

export function AdminJobsTable({ rows }: { rows: readonly AdminJobRow[] }) {
  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No jobs match</EmptyTitle>
          <EmptyDescription>
            Generation jobs appear here as soon as someone starts one.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <DataTable columns={COLUMNS} rows={rows} getKey={(row) => row.jobId} minWidth="min-w-4xl" />
  )
}