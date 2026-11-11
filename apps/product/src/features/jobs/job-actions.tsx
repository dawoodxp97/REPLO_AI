import type { GenerationJobDto } from '@replo/contracts'
import { Button } from '@replo/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { InlineError } from '@/components/inline-error'
import { describeJobActionError } from './job-errors'
import { canCancelJob, canRetryJob } from './job-status'
import { useCancelJob, useRetryJob } from './use-job-actions'

export function JobActions({ job, onRetried }: { job: GenerationJobDto; onRetried: () => void }) {
  const cancel = useCancelJob(job.jobId)
  const retry = useRetryJob(job.jobId, onRetried)
  const canCancel = canCancelJob(job.status)
  const canRetry = canRetryJob(job.status)

  if (!canCancel && !canRetry && !retry.error) return null

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        {canRetry ? (
          <Button disabled={retry.isPending} onClick={() => retry.mutate({ jobId: job.jobId })}>
            {retry.isPending ? 'Retrying…' : 'Retry from the last checkpoint'}
          </Button>
        ) : null}
        {canCancel ? (
          <ConfirmDialog
            triggerLabel="Cancel generation"
            title="Stop generating this tutorial?"
            description="The run stops after the current step. What it has spent stays on your provider bill. You can retry later from the last finished stage."
            confirmLabel="Stop generation"
            run={() => cancel.mutateAsync({ jobId: job.jobId })}
            describeError={describeJobActionError}
          />
        ) : null}
      </div>
      {retry.error ? <InlineError>{describeJobActionError(retry.error)}</InlineError> : null}
    </div>
  )
}
