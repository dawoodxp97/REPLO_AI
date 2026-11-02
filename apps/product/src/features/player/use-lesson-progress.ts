import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

function useInvalidateProgress() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.learning.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
    ])
}

export function useMarkLesson() {
  const onSuccess = useInvalidateProgress()
  return useMutation(orpc.learning.markLesson.mutationOptions({ onSuccess }))
}

export function useUnmarkLesson() {
  const onSuccess = useInvalidateProgress()
  return useMutation(orpc.learning.unmarkLesson.mutationOptions({ onSuccess }))
}
