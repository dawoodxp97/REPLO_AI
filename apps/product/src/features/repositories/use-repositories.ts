import { useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useRemoveRepository() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.repositories.remove.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: orpc.repositories.key() }),
          queryClient.invalidateQueries({ queryKey: orpc.tutorials.key() }),
        ])
      },
    }),
  )
}
