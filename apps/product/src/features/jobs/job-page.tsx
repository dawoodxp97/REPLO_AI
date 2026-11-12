'use client'

import { PageHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { JobActions } from './job-actions'
import { jobPlan, jobTitle, UNNAMED_JOB_TITLE } from './job-heading'
import { JobOutcome } from './job-outcome'
import { JobSummary } from './job-summary'
import { StageList } from './stage-list'
import { useJobPage } from './use-job'

const SAVED_NOTE = 'Progress is saved on the server, so you can leave this page and come back.'

export function JobPage({ jobId }: { jobId: string }) {
  const { job, progress, restart } = useJobPage(jobId)
  const named = job.data?.repository ? job.data : null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={named ? UNNAMED_JOB_TITLE : undefined}
        title={named ? jobTitle(named) : UNNAMED_JOB_TITLE}
        description={job.data ? `${jobPlan(job.data)} ${SAVED_NOTE}` : SAVED_NOTE}
      />
      <QueryBoundary
        query={job}
        errorTitle="We could not load this job"
        errorDescription="Check your connection, then try again."
      >
        {(data) => (
          <div className="space-y-4">
            <JobSummary
              job={data}
              progress={progress}
              actions={<JobActions job={data} onRetried={restart} />}
            />
            <JobOutcome job={data} progress={progress} />
            <StageList progress={progress} />
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
