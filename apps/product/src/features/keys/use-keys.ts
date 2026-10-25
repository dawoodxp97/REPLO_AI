import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useKeys() {
  return useQuery(orpc.keys.list.queryOptions())
}

export function useAddKey() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.keys.add.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.keys.key() }),
    }),
  )
}

export function useValidateKey() {
  return useMutation(orpc.keys.validate.mutationOptions())
}

export function useDeleteKey() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.keys.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.keys.key() }),
    }),
  )
}
