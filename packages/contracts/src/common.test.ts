import { describe, expect, it } from 'vitest'
import {
  ActivityPage,
  HistoryPage,
  NotificationCursor,
  NotificationPage,
  OK_RESULT,
  OkResult,
  OperatorJobPage,
  Preferences,
  Theme,
  contract,
  pageOutput,
} from './index'
import { z } from 'zod'

describe('pageOutput', () => {
  const Page = pageOutput(z.object({ n: z.number() }), z.string().regex(/^\d+$/))

  it('wraps items and a nullable cursor', () => {
    expect(Page.parse({ items: [{ n: 1 }], nextCursor: '10' })).toEqual({
      items: [{ n: 1 }],
      nextCursor: '10',
    })
    expect(Page.parse({ items: [], nextCursor: null }).nextCursor).toBeNull()
  })

  it('rejects a cursor its own input schema would refuse', () => {
    expect(Page.safeParse({ items: [], nextCursor: 'abc' }).success).toBe(false)
    expect(ActivityPage.safeParse({ items: [], nextCursor: 'abc' }).success).toBe(false)
    expect(HistoryPage.safeParse({ items: [], nextCursor: 'abc' }).success).toBe(false)
    expect(OperatorJobPage.safeParse({ items: [], nextCursor: 'abc' }).success).toBe(false)
    expect(HistoryPage.safeParse({ items: [], nextCursor: '40' }).success).toBe(true)
  })
})

describe('notification paging', () => {
  it('accepts opaque url-safe cursors only', () => {
    expect(NotificationCursor.safeParse('eyJhIjoxfQ').success).toBe(true)
    expect(NotificationCursor.safeParse('a b').success).toBe(false)
    expect(NotificationCursor.safeParse('x'.repeat(201)).success).toBe(false)
    expect(NotificationPage.safeParse({ items: [], nextCursor: 'eyJhIjoxfQ' }).success).toBe(true)
  })
})

describe('OK_RESULT', () => {
  it('satisfies OkResult', () => {
    expect(OkResult.parse(OK_RESULT)).toEqual({ ok: true })
  })
})

describe('Theme', () => {
  it('includes system', () => {
    expect(Theme.options).toEqual(['system', 'light', 'dark'])
    expect(
      Preferences.safeParse({
        theme: 'system',
        defaultAudience: 'intermediate',
        autoAdvance: true,
        quizzesEnabled: true,
        browserNotifications: false,
      }).success,
    ).toBe(true)
  })
})

describe('dashboard.summary', () => {
  it('takes no input', () => {
    expect(contract.dashboard.summary['~orpc'].inputSchema).toBeUndefined()
    expect(contract.dashboard.recent['~orpc'].inputSchema).toBeDefined()
  })
})
