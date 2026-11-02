import { describe, expect, it } from 'vitest'
import { formatDateTime, formatLatency, formatMicros } from './operator-format'

describe('formatMicros', () => {
  it('converts micro-USD to dollars', () => {
    expect(formatMicros(1_500_000)).toBe('$1.50')
    expect(formatMicros(0)).toBe('$0.0000')
  })

  it('keeps four decimals for sub-cent amounts', () => {
    expect(formatMicros(2_500)).toBe('$0.0025')
  })
})

describe('formatDateTime', () => {
  it('renders UTC with an explicit zone', () => {
    expect(formatDateTime('2026-11-02T14:05:09.000Z')).toBe('2 Nov 2026, 14:05 UTC')
  })

  it('uses a 24-hour clock at midnight', () => {
    expect(formatDateTime('2026-01-05T00:07:00.000Z')).toBe('5 Jan 2026, 00:07 UTC')
  })
})

describe('formatLatency', () => {
  it('shows milliseconds below one second', () => {
    expect(formatLatency(840)).toBe('840 ms')
  })

  it('shows seconds from one second', () => {
    expect(formatLatency(12_340)).toBe('12.3 s')
  })
})
