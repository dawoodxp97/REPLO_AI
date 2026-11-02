import type { TutorialPage, TutorialSummaryDto } from '@replo/contracts'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { invalidateGenerationQueries } from '@/lib/generation-cache'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'

const PAGE_SIZE = 25

export function useTutorialList() {
  return useInfiniteQuery(
    orpc.tutorials.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      ...cursorPaging,
    }),
  )
}

function replaceTutorial(updated: TutorialSummaryDto) {
  return (data: InfiniteData<TutorialPage> | undefined) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) => (item.id === updated.id ? updated : item)),
      })),
    }
}

export function useSetVisibility() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.tutorials.setVisibility.mutationOptions({
      onSuccess: async (updated) => {
        queryClient.setQueriesData<InfiniteData<TutorialPage>>(
          { queryKey: orpc.tutorials.list.key() },
          replaceTutorial(updated),
        )
        await invalidateGenerationQueries(queryClient)
      },
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
      onSuccess: () =>
        Promise.all([
          invalidateGenerationQueries(queryClient),
          queryClient.invalidateQueries({ queryKey: orpc.search.key() }),
        ]),
    }),
  )
}
