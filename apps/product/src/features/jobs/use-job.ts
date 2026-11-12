import type { GenerationJobDto } from '@replo/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { orpc } from '@/lib/orpc'
import { isActiveJob } from './job-status'
import { useJobEvents } from './use-job-events'

const POLL_WITHOUT_STREAM_MS = 5_000

export function useJobPage(jobId: string) {
  const { progress, restart } = useJobEvents(jobId)
  const job = useQuery(
    orpc.jobs.get.queryOptions({
      input: { jobId },
      refetchInterval: (query) => {
        const status = query.state.data?.status
        if (status !== undefined && !isActiveJob(status)) return false
        return progress.connection === 'lost' ? POLL_WITHOUT_STREAM_MS : false
      },
    }),
  )
  return { job, progress, restart }
}

function useSettleJob(jobId: string) {
  const queryClient = useQueryClient()
  return (job: GenerationJobDto) => {
    queryClient.setQueryData(orpc.jobs.get.queryKey({ input: { jobId } }), job)
    void invalidateGenerationQueries(queryClient)
  }
}

export function useCancelJob(jobId: string) {
  const settle = useSettleJob(jobId)
  return useMutation(orpc.jobs.cancel.mutationOptions({ onSuccess: settle }))
}

export function useRetryJob(jobId: string, onRetried: () => void) {
  const settle = useSettleJob(jobId)
  return useMutation(
    orpc.jobs.retry.mutationOptions({
      onSuccess: (job) => {
        settle(job)
        onRetried()
      },
    }),
  )
}
