import { describe, expect, it } from 'vitest'
import { formatElapsed } from './format-elapsed'

describe('formatElapsed', () => {
  it('shows seconds under a minute', () => {
    expect(formatElapsed(0)).toBe('0s')
    expect(formatElapsed(4_900)).toBe('4s')
  })

  it('shows minutes and padded seconds', () => {
    expect(formatElapsed(72_000)).toBe('1m 12s')
    expect(formatElapsed(305_000)).toBe('5m 05s')
  })

  it('shows hours and padded minutes', () => {
    expect(formatElapsed(3_720_000)).toBe('1h 02m')
  })

  it('never goes negative', () => {
    expect(formatElapsed(-2_000)).toBe('0s')
  })
})
