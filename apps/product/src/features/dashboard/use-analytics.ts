import type { AnalyticsQuery } from '@replo/contracts'
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'

const DASHBOARD_PAGE_SIZE = 20

export function useAnalytics(query: AnalyticsQuery) {
  return useQuery(
    orpc.dashboard.analytics.queryOptions({
      input: query,
      placeholderData: keepPreviousData,
    }),
  )
}

export function useSavedDashboards() {
  return useInfiniteQuery(
    orpc.dashboard.listDashboards.infiniteOptions({
      input: (cursor) => ({ limit: DASHBOARD_PAGE_SIZE, cursor }),
      ...cursorPaging,
    }),
  )
}

function useDashboardListInvalidation() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.dashboard.listDashboards.key() }),
      queryClient.invalidateQueries({ queryKey: orpc.search.key() }),
    ])
}

export function useSaveDashboard() {
  const onSuccess = useDashboardListInvalidation()
  return useMutation(orpc.dashboard.save.mutationOptions({ onSuccess }))
}

export function useDeleteDashboard() {
  const onSuccess = useDashboardListInvalidation()
  return useMutation(orpc.dashboard.deleteDashboard.mutationOptions({ onSuccess }))
}
