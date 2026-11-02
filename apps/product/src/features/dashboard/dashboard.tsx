'use client'

import { Skeleton } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { importPath, NEW_TUTORIAL_LABEL } from '@/lib/import-path'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { GettingStarted } from './getting-started'
import { JobsInFlight } from './jobs-in-flight'
import { RecentActivity } from './recent-activity'
import { ResumeCard } from './resume-card'
import { StatTiles } from './stat-tiles'
import { useDashboardSummary } from './use-dashboard'

export function Dashboard() {
  const summary = useDashboardSummary()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Pick up where you left off, or start a tutorial for a new repository."
        action={<LinkButton href={importPath()}>{NEW_TUTORIAL_LABEL}</LinkButton>}
      />

      <QueryBoundary
        query={summary}
        errorTitle="We could not load your home"
        errorDescription="Check your connection, then try again."
        loading={<Skeleton aria-busy="true" className="h-24 w-full" />}
      >
        {(data) => (
          <>
            {data.resume ? <ResumeCard resume={data.resume} /> : null}
            <StatTiles counts={data.counts} />
            <JobsInFlight jobs={data.jobsInFlight} />
            {data.counts.total === 0 ? <GettingStarted /> : null}
          </>
        )}
      </QueryBoundary>

      <RecentActivity />
    </div>
  )
}
