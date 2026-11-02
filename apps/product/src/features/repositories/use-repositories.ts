import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateGenerationQueries } from '@/features/jobs/invalidate-generation-queries'
import { orpc } from '@/lib/orpc'
import { FIRST_PAGE, nextCursorOf } from '@/lib/paging'

const PAGE_SIZE = 25

export function useRepositoryList() {
  return useInfiniteQuery(
    orpc.repositories.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextCursorOf,
    }),
  )
}

export function useRemoveRepository() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.repositories.remove.mutationOptions({
      onSuccess: () => invalidateGenerationQueries(queryClient),
    }),
  )
}
