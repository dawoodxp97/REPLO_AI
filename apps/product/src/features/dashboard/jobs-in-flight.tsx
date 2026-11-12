import type { DashboardSummary } from '@replo/contracts'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  Progress,
} from '@replo/ui'
import { SectionHeader } from '@/components/page-header'
import { JobStatusLink } from '@/features/jobs/job-status-badge'
import { STAGE_LABELS } from '@/features/jobs/job-status'
import { formatRepoName } from '@/lib/format'

type JobInFlight = DashboardSummary['jobsInFlight'][number]

export function JobsInFlight({ jobs }: { jobs: readonly JobInFlight[] }) {
  if (jobs.length === 0) return null

  return (
    <section aria-labelledby="in-flight-heading" className="space-y-3">
      <SectionHeader id="in-flight-heading" title="In progress" />
      <ItemGroup>
        {jobs.map((job) => (
          <Item key={job.jobId}>
            <ItemContent>
              <ItemTitle className="font-mono">{formatRepoName(job.owner, job.repo)}</ItemTitle>
              <ItemDescription className="text-xs">
                {job.stage ? STAGE_LABELS[job.stage] : 'Waiting to start'}
                <span className="tabular font-mono"> · {job.progress}%</span>
              </ItemDescription>
              <Progress
                value={job.progress}
                aria-label={`Progress for ${formatRepoName(job.owner, job.repo)}`}
                className="h-1 max-w-xs"
              />
            </ItemContent>
            <ItemActions>
              <JobStatusLink jobId={job.jobId} status={job.status} />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </section>
  )
}
