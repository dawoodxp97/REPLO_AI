import { UnreadCount } from '@replo/contracts'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useState } from 'react'
import { useEventSource } from '@/hooks/use-event-source'
import { env } from '@/lib/env'
import { orpc } from '@/lib/orpc'
import { cursorPaging } from '@/lib/paging'
import { parseJsonWith } from '@/lib/parse-json'

const UNREAD_POLL_MS = 30_000
const PAGE_SIZE = 20

export async function applyUnreadEvent(queryClient: QueryClient, raw: string): Promise<void> {
  const unread = parseJsonWith(UnreadCount, raw)
  if (!unread) return
  await queryClient.cancelQueries({
    queryKey: orpc.notifications.unreadCount.queryKey(),
    exact: true,
  })
  queryClient.setQueryData(orpc.notifications.unreadCount.queryKey(), unread)
  void queryClient.invalidateQueries({ queryKey: orpc.notifications.list.key() })
}

export function useUnreadCount() {
  const queryClient = useQueryClient()
  const [pushed, setPushed] = useState(false)

  useEventSource({
    url: `${env.apiUrl}/notifications/stream`,
    events: ['unread'],
    onMessage: (raw) => void applyUnreadEvent(queryClient, raw),
    onOpen: () => {
      setPushed(true)
      void queryClient.invalidateQueries({ queryKey: orpc.notifications.unreadCount.key() })
    },
    onError: () => setPushed(false),
  })

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
      ...cursorPaging,
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
