import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'
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
