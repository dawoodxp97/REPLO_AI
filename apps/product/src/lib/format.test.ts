import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatCount,
  formatDate,
  formatDateTime,
  formatLatency,
  formatMicros,
  formatRepoName,
  shortSha,
  formatMinutes,
  formatPercent,
  formatUsd,
} from './format'

describe('formatBytes', () => {
  it('uses whole bytes below one kilobyte', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('keeps one decimal below ten units and rounds above', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB')
  })
})

describe('formatUsd', () => {
  it('shows cents for ordinary amounts', () => {
    expect(formatUsd(2)).toBe('$2.00')
  })

  it('keeps precision for sub-cent estimates', () => {
    expect(formatUsd(0.0042)).toBe('$0.0042')
  })
})

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(12345)).toBe('12,345')
  })
})

describe('formatDate', () => {
  it('renders a stable UTC day', () => {
    expect(formatDate('2026-10-22T23:30:00.000Z')).toBe('22 Oct 2026')
  })
})

describe('formatMinutes', () => {
  it('stays in minutes below an hour', () => {
    expect(formatMinutes(12)).toBe('12 min')
  })

  it('switches to hours and minutes', () => {
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(95)).toBe('1 h 35 min')
  })

  it('never goes negative', () => {
    expect(formatMinutes(-4)).toBe('0 min')
  })
})

describe('formatPercent', () => {
  it('rounds a ratio to a whole percent', () => {
    expect(formatPercent(0.333)).toBe('33%')
    expect(formatPercent(1)).toBe('100%')
  })
})

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

describe('formatRepoName', () => {
  it('joins owner and name', () => {
    expect(formatRepoName('acme', 'widgets')).toBe('acme/widgets')
  })
})

describe('shortSha', () => {
  it('keeps the first seven characters', () => {
    expect(shortSha('3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6')).toBe('3f9c1a2')
  })
})
