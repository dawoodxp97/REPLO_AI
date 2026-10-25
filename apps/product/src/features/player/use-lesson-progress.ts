import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useMarkLesson() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.learning.markLesson.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.learning.key() }),
    }),
  )
}

export function useUnmarkLesson() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.learning.unmarkLesson.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.learning.key() }),
    }),
  )
}
