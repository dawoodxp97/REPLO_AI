import { describe, expect, it } from 'vitest'
import {
  ActivityPage,
  BudgetUsd,
  HistoryPage,
  ImportRepositoryInput,
  MAX_BUDGET_USD,
  ModelPreferences,
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

const KEY_ID = '0190f6a2-7c1e-7d4a-8f3b-2a9c4e5d6f70'

describe('BudgetUsd', () => {
  it('is the single bound for model preferences and repository imports', () => {
    const over = MAX_BUDGET_USD + 1
    expect(BudgetUsd.safeParse(MAX_BUDGET_USD).success).toBe(true)
    expect(BudgetUsd.safeParse(over).success).toBe(false)
    expect(BudgetUsd.safeParse(0).success).toBe(false)
    expect(
      ModelPreferences.safeParse({ preset: 'balanced', customModels: null, defaultBudgetUsd: over })
        .success,
    ).toBe(false)
    expect(
      ImportRepositoryInput.safeParse({
        source: { kind: 'public_url', url: 'https://github.com/a/b' },
        keyId: KEY_ID,
        budgetUsd: over,
      }).success,
    ).toBe(false)
  })
})

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
