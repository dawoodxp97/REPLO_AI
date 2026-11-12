'use client'

import { Skeleton } from '@replo/ui'
import { NewTutorialAction } from '@/components/new-tutorial-action'
import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { GettingStarted } from './getting-started'
import { JobsInFlight } from './jobs-in-flight'
import { LibraryCounts } from './library-counts'
import { ReadingStats } from './reading-stats'
import { RecentActivity } from './recent-activity'
import { RepositoryShortlist } from './repository-shortlist'
import { ResumeCard } from './resume-card'
import { TutorialShelf } from './tutorial-shelf'
import { useDashboardSummary } from './use-dashboard'
import { WorkspaceCard } from './workspace-card'

export function Dashboard() {
  const summary = useDashboardSummary()

  return (
    <div className="space-y-8">
      <PageHeader
        title="Home"
        description="Pick up where you left off, or start a tutorial for a new repository."
        action={<NewTutorialAction />}
      />

      <QueryBoundary
        query={summary}
        errorTitle="We could not load your home"
        errorDescription="Check your connection, then try again."
        loading={<Skeleton aria-busy="true" className="h-24 w-full" />}
      >
        {(data) => (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <div className="min-w-0 space-y-8">
              {data.resume ? <ResumeCard resume={data.resume} /> : null}
              <JobsInFlight jobs={data.jobsInFlight} />
              {data.counts.total === 0 ? <GettingStarted /> : <TutorialShelf />}
              <RecentActivity />
            </div>
            <aside aria-label="Workspace summary" className="space-y-4">
              <WorkspaceCard />
              {data.counts.total > 0 ? <ReadingStats reading={data.reading} /> : null}
              {data.counts.total > 0 ? <LibraryCounts counts={data.counts} /> : null}
              <RepositoryShortlist />
            </aside>
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
