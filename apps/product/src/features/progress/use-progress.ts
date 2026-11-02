import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { FIRST_PAGE, nextCursorOf, pageItems } from '@/lib/paging'

const HISTORY_PAGE_SIZE = 25

export interface ProgressIds {
  tutorialId: string
  versionId: string
}

export function useTutorialProgress(ids: ProgressIds) {
  return useQuery(orpc.learning.getProgress.queryOptions({ input: ids }))
}

export function useLessonHistory(ids: ProgressIds) {
  const query = useInfiniteQuery(
    orpc.learning.history.infiniteOptions({
      input: (cursor) => ({ ...ids, limit: HISTORY_PAGE_SIZE, cursor }),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextCursorOf,
    }),
  )
  return { query, entries: pageItems(query.data) }
}
