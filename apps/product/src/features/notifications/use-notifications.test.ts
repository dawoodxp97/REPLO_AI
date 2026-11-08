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
  it('stores the pushed count and marks the notification list stale', async () => {
    const queryClient = seededClient()
    await applyUnreadEvent(queryClient, JSON.stringify({ count: 3 }))
    expect(queryClient.getQueryData(orpc.notifications.unreadCount.queryKey())).toEqual({
      count: 3,
    })
    expect(queryClient.getQueryState(orpc.notifications.list.key())?.isInvalidated).toBe(true)
  })

  it('ignores a malformed event', async () => {
    const queryClient = seededClient()
    await applyUnreadEvent(queryClient, 'not json')
    await applyUnreadEvent(queryClient, JSON.stringify({ count: 'many' }))
    expect(queryClient.getQueryData(orpc.notifications.unreadCount.queryKey())).toEqual({
      count: 0,
    })
    expect(queryClient.getQueryState(orpc.notifications.list.key())?.isInvalidated).toBe(false)
  })

  it('prevents an older HTTP response from overwriting a pushed count', async () => {
    const queryClient = seededClient()
    let finishRequest: ((value: { count: number }) => void) | undefined
    const pending = queryClient
      .fetchQuery({
        queryKey: orpc.notifications.unreadCount.queryKey(),
        queryFn: () =>
          new Promise<{ count: number }>((resolve) => {
            finishRequest = resolve
          }),
      })
      .catch(() => undefined)

    await applyUnreadEvent(queryClient, JSON.stringify({ count: 7 }))
    finishRequest?.({ count: 2 })
    await pending

    expect(queryClient.getQueryData(orpc.notifications.unreadCount.queryKey())).toEqual({
      count: 7,
    })
    queryClient.clear()
  })
})
