'use client'

import { QueryBoundary } from '@/components/query-boundary'
import { JobActions } from './job-actions'
import { JobOutcome } from './job-outcome'
import { JobSummary } from './job-summary'
import { StageList } from './stage-list'
import { useJobPage } from './use-job-page'

export function JobPage({ jobId }: { jobId: string }) {
  const { job, progress, restart } = useJobPage(jobId)

  return (
    <QueryBoundary
      query={job}
      errorTitle="We could not load this job"
      errorDescription="Check your connection, then try again."
    >
      {(data) => (
        <div className="space-y-4">
          <JobSummary job={data} connection={progress.connection} />
          <JobOutcome job={data} progress={progress} />
          <JobActions job={data} onRetried={restart} />
          <StageList progress={progress} />
        </div>
      )}
    </QueryBoundary>
  )
}
