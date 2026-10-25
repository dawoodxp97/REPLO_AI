import { UnreadCount } from '@replo/contracts'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { env } from '@/lib/env'
import { orpc } from '@/lib/orpc'

const UNREAD_POLL_MS = 30_000
const PAGE_SIZE = 20
const NO_CURSOR: string | undefined = undefined

export function useUnreadCount() {
  const queryClient = useQueryClient()
  const [pushed, setPushed] = useState(false)

  useEffect(() => {
    const source = new EventSource(`${env.apiUrl}/notifications/stream`, { withCredentials: true })
    source.onopen = () => setPushed(true)
    source.onerror = () => setPushed(false)
    source.addEventListener('unread', (message: MessageEvent<string>) => {
      const unread = UnreadCount.parse(JSON.parse(message.data))
      queryClient.setQueryData(orpc.notifications.unreadCount.queryKey(), unread)
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
      initialPageParam: NO_CURSOR,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      enabled,
    }),
  )
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.notifications.markRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
    }),
  )
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.notifications.markAllRead.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
    }),
  )
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation(
    orpc.notifications.delete.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
    }),
  )
}
