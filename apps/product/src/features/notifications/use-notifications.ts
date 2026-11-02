import { UnreadCount } from '@replo/contracts'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { env } from '@/lib/env'
import { orpc } from '@/lib/orpc'
import { FIRST_PAGE, nextCursorOf } from '@/lib/paging'

const UNREAD_POLL_MS = 30_000
const PAGE_SIZE = 20

function parseUnreadCount(raw: string): UnreadCount | null {
  try {
    const parsed = UnreadCount.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function applyUnreadEvent(queryClient: QueryClient, raw: string): void {
  const unread = parseUnreadCount(raw)
  if (!unread) return
  queryClient.setQueryData(orpc.notifications.unreadCount.queryKey(), unread)
  void queryClient.invalidateQueries({ queryKey: orpc.notifications.list.key() })
}

export function useUnreadCount() {
  const queryClient = useQueryClient()
  const [pushed, setPushed] = useState(false)

  useEffect(() => {
    const source = new EventSource(`${env.apiUrl}/notifications/stream`, { withCredentials: true })
    source.onopen = () => setPushed(true)
    source.onerror = () => setPushed(false)
    source.addEventListener('unread', (message: MessageEvent<string>) => {
      applyUnreadEvent(queryClient, message.data)
    })
    return () => {
      source.close()
      setPushed(false)
    }
  }, [queryClient])

  return useQuery(
    orpc.notifications.unreadCount.queryOptions({
      refetchInterval: pushed ? false : UNREAD_POLL_MS,
    }),
  )
}

export function useNotificationList(enabled: boolean) {
  return useInfiniteQuery(
    orpc.notifications.list.infiniteOptions({
      input: (cursor) => ({ limit: PAGE_SIZE, cursor }),
      initialPageParam: FIRST_PAGE,
      getNextPageParam: nextCursorOf,
      enabled,
    }),
  )
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() })
}

export function useMarkRead() {
  const onSuccess = useInvalidateNotifications()
  return useMutation(orpc.notifications.markRead.mutationOptions({ onSuccess }))
}

export function useMarkAllRead() {
  const onSuccess = useInvalidateNotifications()
  return useMutation(orpc.notifications.markAllRead.mutationOptions({ onSuccess }))
}

export function useDeleteNotification() {
  const onSuccess = useInvalidateNotifications()
  return useMutation(orpc.notifications.delete.mutationOptions({ onSuccess }))
}
