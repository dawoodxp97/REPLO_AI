import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

const PAGE_SIZE = 25
const NO_CURSOR: string | undefined = undefined

export function useTutorialList() {
  return useInfiniteQuery(
    orpc.tutorials.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      initialPageParam: NO_CURSOR,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    }),
  )
}

export function useSetVisibility() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.tutorials.setVisibility.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.tutorials.key() }),
    }),
  )
}

export function useCreateShareLink() {
  return useMutation(orpc.tutorials.createShareLink.mutationOptions())
}

export function useDeleteTutorial() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.tutorials.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.tutorials.key() }),
    }),
  )
}
