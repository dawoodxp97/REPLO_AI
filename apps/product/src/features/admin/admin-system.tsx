'use client'

import type { AdminQueueRow } from '@replo/contracts'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { DataTable, type DataColumn } from '@/components/data-table'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { formatBytes, formatCount, formatDateTime } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { StatCard } from './stat-card'

const QUEUE_COLUMNS: readonly DataColumn<AdminQueueRow>[] = [
  { header: 'Queue', cell: (row) => <span className="font-mono text-xs">{row.name}</span> },
  {
    header: 'Queued',
    cell: (row) => <span className="tabular font-mono text-xs">{row.queued}</span>,
  },
  {
    header: 'Active',
    cell: (row) => <span className="tabular font-mono text-xs">{row.active}</span>,
  },
  {
    header: 'Failed',
    cell: (row) => <span className="tabular font-mono text-xs">{row.failed}</span>,
  },
  {
    header: 'Last run',
    cell: (row) => (row.lastRunAt ? formatDateTime(row.lastRunAt) : '—'),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
]

export function AdminSystem() {
  const system = useQuery(orpc.admin.system.queryOptions())

  return (
    <div className="space-y-8">
      <PageHeader
        title="System"
        description="Database reachability, queue depth, job counts and storage."
      />
      <QueryBoundary query={system} errorTitle="We could not load the system status">
        {(data) => (
          <>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Database"
                value={
                  <Badge variant={data.database === 'up' ? 'observed' : 'destructive'}>
                    {data.database === 'up' ? 'Up' : 'Down'}
                  </Badge>
                }
              />
              <StatCard label="Queued" value={formatCount(data.jobs.queued)} />
              <StatCard label="Running" value={formatCount(data.jobs.running)} />
              <StatCard label="Stalled" value={formatCount(data.jobs.stalled)} />
              <StatCard
                label="Failed last 24h"
                value={formatCount(data.jobs.failed24h)}
                tone={data.jobs.failed24h > 0 ? 'destructive' : undefined}
              />
              <StatCard label="Snapshot storage" value={formatBytes(data.storageBytes)} />
            </dl>

            <Card>
              <CardHeader>
                <CardTitle>Version</CardTitle>
                <CardDescription>Build identifier reported by the API.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-sm">{data.version}</p>
              </CardContent>
            </Card>

            <section aria-labelledby="queues-heading" className="space-y-3">
              <h2 id="queues-heading" className="text-base font-semibold tracking-tight">
                Queues
              </h2>
              <DataTable
                columns={QUEUE_COLUMNS}
                rows={data.queues}
                getKey={(row) => row.name}
                minWidth="min-w-2xl"
              />
            </section>
          </>
        )}
      </QueryBoundary>
    </div>
  )
}