'use client'

import { formatBytes, formatCount } from '@/lib/format'
import { orpc } from '@/lib/orpc'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { StatCard } from './stat-card'

export function AdminOverview() {
  const summary = useQuery(orpc.admin.overview.queryOptions())

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Platform-wide totals across users, repositories and generations."
      />
      <QueryBoundary query={summary} errorTitle="We could not load the overview">
        {(data) => (
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Users" value={formatCount(data.users)} />
            <StatCard label="Repositories" value={formatCount(data.repositories)} />
            <StatCard label="Courses" value={formatCount(data.courses)} />
            <StatCard label="Generations in flight" value={formatCount(data.jobsInFlight)} />
            <StatCard
              label="Failures last 24h"
              value={formatCount(data.jobsFailedLast24h)}
              tone={data.jobsFailedLast24h > 0 ? 'destructive' : undefined}
            />
            <StatCard label="Snapshot storage" value={formatBytes(data.storageBytes)} />
          </dl>
        )}
      </QueryBoundary>
    </div>
  )
}