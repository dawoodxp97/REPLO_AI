import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'

const PAGE_SIZE = 25

export function useCourseList() {
  return useInfiniteQuery(
    orpc.courses.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      ...cursorPaging,
    }),
  )
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.courses.delete.mutationOptions({
      onSuccess: () =>
        Promise.all([
          invalidateGenerationQueries(queryClient),
          queryClient.invalidateQueries({ queryKey: orpc.search.key() }),
        ]),
    }),
  )
}
