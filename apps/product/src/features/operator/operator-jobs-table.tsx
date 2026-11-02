import type { OperatorJobRow } from '@replo/contracts'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@replo/ui'
import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import { JobStatusBadge } from '@/features/jobs/job-status-badge'
import { formatDateTime, formatMicros } from './operator-format'

const COLUMNS = ['Job', 'Status', 'Stage', 'Pipeline', 'Progress', 'Spent', 'Created'] as const

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
      <div className="rounded-lg border bg-card shadow-xs">
        <Table className="min-w-[48rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableHead key={column} scope="col">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.jobId}>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/operator/jobs/${row.jobId}`}
                    className="text-link underline underline-offset-4"
                  >
                    {row.jobId.slice(0, 8)}
                  </Link>
                </TableCell>
                <TableCell>
                  <JobStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="font-mono text-xs">{row.stage ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{row.pipeline}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={row.progress} aria-label="Job progress" className="w-16" />
                    <span className="tabular w-9 text-right text-xs text-muted-foreground">
                      {row.progress}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="tabular font-mono text-xs whitespace-nowrap">
                  {formatMicros(row.spentMicros)} of {formatMicros(row.budgetMicros)}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
