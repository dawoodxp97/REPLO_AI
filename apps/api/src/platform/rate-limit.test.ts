import { describe, expect, it } from 'vitest'
import { FixedWindowLimiter } from './rate-limit'

describe('FixedWindowLimiter', () => {
  it('allows up to the maximum inside one window and refuses the next call with a retry hint', () => {
    let now = 0
    const limiter = new FixedWindowLimiter(2, 60_000, () => now)

    expect(limiter.take('ip:1')).toEqual({ allowed: true })
    expect(limiter.take('ip:1')).toEqual({ allowed: true })
    expect(limiter.take('ip:1')).toEqual({ allowed: false, retryAfterSeconds: 60 })

    now = 30_000
    expect(limiter.take('ip:1')).toEqual({ allowed: false, retryAfterSeconds: 30 })
  })

  it('opens a fresh window once the current one has elapsed', () => {
    let now = 0
    const limiter = new FixedWindowLimiter(1, 1_000, () => now)
    limiter.take('user:a')
    now = 1_000
    expect(limiter.take('user:a')).toEqual({ allowed: true })
  })

  it('keeps keys independent', () => {
    const limiter = new FixedWindowLimiter(1, 60_000, () => 0)
    limiter.take('user:a')
    expect(limiter.take('user:b')).toEqual({ allowed: true })
  })
})
