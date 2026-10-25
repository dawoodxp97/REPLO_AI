import { describe, expect, it } from 'vitest'
import { formatBytes, formatCount, formatUsd } from './format'

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
