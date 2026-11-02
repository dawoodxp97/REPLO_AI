import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { orpc } from '@/lib/orpc'
import { applyUnreadEvent } from './use-notifications'

function seededClient() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(orpc.notifications.unreadCount.queryKey(), { count: 0 })
  queryClient.setQueryData(orpc.notifications.list.key(), { pages: [], pageParams: [] })
  return queryClient
}

describe('applyUnreadEvent', () => {
  it('stores the pushed count and marks the notification list stale', () => {
    const queryClient = seededClient()
    applyUnreadEvent(queryClient, JSON.stringify({ count: 3 }))
    expect(queryClient.getQueryData(orpc.notifications.unreadCount.queryKey())).toEqual({
      count: 3,
    })
    expect(queryClient.getQueryState(orpc.notifications.list.key())?.isInvalidated).toBe(true)
  })

  it('ignores a malformed event', () => {
    const queryClient = seededClient()
    applyUnreadEvent(queryClient, 'not json')
    applyUnreadEvent(queryClient, JSON.stringify({ count: 'many' }))
    expect(queryClient.getQueryData(orpc.notifications.unreadCount.queryKey())).toEqual({
      count: 0,
    })
    expect(queryClient.getQueryState(orpc.notifications.list.key())?.isInvalidated).toBe(false)
  })
})
