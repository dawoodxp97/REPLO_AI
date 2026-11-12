import type { JobStatus } from '@replo/contracts'
import { Badge, type BadgeProps } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { isActiveJob, JOB_STATUS_LABELS } from './job-status'

const VARIANTS: Record<JobStatus, BadgeProps['variant']> = {
  queued: 'outline',
  running: 'outline',
  waiting_retry: 'interpretation',
  stalled: 'interpretation',
  canceling: 'outline',
  succeeded: 'observed',
  failed: 'destructive',
  canceled: 'outline',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const active = isActiveJob(status)
  return (
    <Badge variant={VARIANTS[status]}>
      {active ? (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {JOB_STATUS_LABELS[status]}
    </Badge>
  )
}

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
