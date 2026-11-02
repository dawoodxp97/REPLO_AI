import type { JobStatus } from '@replo/contracts'
import { LinkButton } from '@/components/link-button'
import { JobStatusBadge } from './job-status-badge'

export function JobStatusLink({ jobId, status }: { jobId: string; status: JobStatus }) {
  return (
    <>
      <JobStatusBadge status={status} />
      <LinkButton href={`/jobs/${jobId}`} variant="outline" size="sm">
        View job
      </LinkButton>
    </>
  )
}
