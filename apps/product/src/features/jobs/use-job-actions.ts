import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useCancelJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.jobs.cancel.mutationOptions({
      onSuccess: (job) => {
        queryClient.setQueryData(orpc.jobs.get.queryKey({ input: { jobId } }), job)
      },
    }),
  )
}

export function useRetryJob(jobId: string) {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.jobs.retry.mutationOptions({
      onSuccess: (job) => {
        queryClient.setQueryData(orpc.jobs.get.queryKey({ input: { jobId } }), job)
      },
    }),
  )
}
