import type { GenerationJobDto } from '@replo/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { invalidateGenerationQueries } from '@/lib/generation-cache'

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
