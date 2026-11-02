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

describe('FixedWindowLimiter memory bounds', () => {
  it('drops expired windows without waiting for a size threshold', () => {
    let now = 0
    const limiter = new FixedWindowLimiter(1, 1_000, () => now, 100)
    limiter.take('a')
    limiter.take('b')
    now = 1_000
    expect(limiter.take('a')).toEqual({ allowed: true })
    expect(limiter.take('b')).toEqual({ allowed: true })
    expect(limiter.take('b')).toEqual({ allowed: false, retryAfterSeconds: 1 })
  })

  it('evicts the oldest window when the key cap is reached', () => {
    const limiter = new FixedWindowLimiter(1, 60_000, () => 0, 2)
    limiter.take('a')
    limiter.take('b')
    limiter.take('c')
    expect(limiter.take('b')).toEqual({ allowed: false, retryAfterSeconds: 60 })
    expect(limiter.take('c')).toEqual({ allowed: false, retryAfterSeconds: 60 })
    expect(limiter.take('a')).toEqual({ allowed: true })
  })

  it('never tracks more keys than the cap under key rotation', () => {
    const limiter = new FixedWindowLimiter(1, 60_000, () => 0, 50)
    for (let i = 0; i < 1_000; i++) limiter.take(`ip:${i}`)
    const tracked = (limiter as unknown as { windows: Map<string, unknown> }).windows
    expect(tracked.size).toBe(50)
  })

  it('keeps insertion order equal to expiry order when a key reopens', () => {
    let now = 0
    const limiter = new FixedWindowLimiter(1, 1_000, () => now, 100)
    limiter.take('a')
    now = 500
    limiter.take('b')
    now = 1_000
    limiter.take('a')
    now = 1_500
    expect(limiter.take('b')).toEqual({ allowed: true })
    expect(limiter.take('a')).toEqual({ allowed: false, retryAfterSeconds: 1 })
  })
})
