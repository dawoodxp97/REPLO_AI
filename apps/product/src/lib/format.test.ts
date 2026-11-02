import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatCount,
  formatDate,
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
