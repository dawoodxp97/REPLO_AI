import type { GenerationJobDto } from '@replo/contracts'
import { Alert, AlertDescription, Button } from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import { describeJobActionError } from './job-errors'
import { canCancelJob, canRetryJob } from './job-status'
import { useCancelJob, useRetryJob } from './use-job-actions'

export function JobActions({ job, onRetried }: { job: GenerationJobDto; onRetried: () => void }) {
  const cancel = useCancelJob(job.jobId)
  const retry = useRetryJob(job.jobId, onRetried)
  const canCancel = canCancelJob(job.status)
  const canRetry = canRetryJob(job.status)
  const failure = cancel.error ?? retry.error

  if (!canCancel && !canRetry && !failure) return null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            variant="outline"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate({ jobId: job.jobId })}
          >
            {cancel.isPending ? 'Canceling…' : 'Cancel generation'}
          </Button>
        ) : null}
        {canRetry ? (
          <Button disabled={retry.isPending} onClick={() => retry.mutate({ jobId: job.jobId })}>
            {retry.isPending ? 'Retrying…' : 'Retry from the last checkpoint'}
          </Button>
        ) : null}
      </div>
      {failure ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>
            <p>{describeJobActionError(failure)}</p>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
