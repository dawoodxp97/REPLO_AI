import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'

const PAGE_SIZE = 25

export function useRepositoryList() {
  return useInfiniteQuery(
    orpc.repositories.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      ...cursorPaging,
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
