import { describe, expect, it } from 'vitest'
import { analyticsQueryFor, isoDateInZone, shiftIsoDate } from './analytics-range'

describe('analytics date ranges', () => {
  it('formats a date in the caller time zone', () => {
    const instant = new Date('2026-11-18T23:30:00.000Z')
    expect(isoDateInZone(instant, 'UTC')).toBe('2026-11-18')
    expect(isoDateInZone(instant, 'Asia/Tokyo')).toBe('2026-11-19')
  })

  it('shifts dates across month and year boundaries', () => {
    expect(shiftIsoDate('2026-11-18', -17)).toBe('2026-11-01')
    expect(shiftIsoDate('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftIsoDate('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('builds an inclusive range that ends today', () => {
    const query = analyticsQueryFor(30, 'week', 'UTC', new Date('2026-11-18T12:00:00.000Z'))
    expect(query.from).toBe('2026-10-20')
    expect(query.to).toBe('2026-11-18')
    expect(query.granularity).toBe('week')
    expect(query.filters).toEqual({})
  })
})
