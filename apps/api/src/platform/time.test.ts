import { describe, expect, it } from 'vitest'
import { DAY_MS, daysAgo, isoOrNull } from './time'

describe('time helpers', () => {
  it('subtracts whole days', () => {
    const now = new Date('2026-03-10T12:00:00.000Z')
    expect(daysAgo(now, 1).getTime()).toBe(now.getTime() - DAY_MS)
    expect(daysAgo(now, 90).toISOString()).toBe('2025-12-10T12:00:00.000Z')
  })

  it('formats a date or yields null', () => {
    expect(isoOrNull(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00.000Z')
    expect(isoOrNull(null)).toBeNull()
    expect(isoOrNull(undefined)).toBeNull()
  })
})
