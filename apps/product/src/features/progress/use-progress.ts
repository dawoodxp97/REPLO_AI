import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cursorPaging, pageItems } from '@/lib/paging'

const HISTORY_PAGE_SIZE = 25

export interface ProgressIds {
  tutorialId: string
  versionId: string
}

export function useTutorialProgress(ids: ProgressIds | typeof skipToken) {
  return useQuery(orpc.learning.getProgress.queryOptions({ input: ids }))
}

export function useLessonHistory(ids: ProgressIds) {
  const query = useInfiniteQuery(
    orpc.learning.history.infiniteOptions({
      input: (cursor) => ({ ...ids, limit: HISTORY_PAGE_SIZE, cursor }),
      ...cursorPaging,
    }),
  )
  return { query, entries: pageItems(query.data) }
}

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
