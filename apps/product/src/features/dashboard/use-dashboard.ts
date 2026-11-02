import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'

const RECENT_PAGE_SIZE = 10

export function useDashboardSummary() {
  return useQuery(orpc.dashboard.summary.queryOptions())
}

export function useRecentActivity() {
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  return useInfiniteQuery(
    orpc.dashboard.recent.infiniteOptions({
      input: (cursor) => ({ tz: timeZone, limit: RECENT_PAGE_SIZE, cursor }),
      ...cursorPaging,
    }),
  )
}
